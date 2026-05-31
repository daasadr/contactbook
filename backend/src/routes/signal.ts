import type { FastifyInstance } from 'fastify'
import { sql } from '../db'
import { authenticate } from '../middleware/authenticate'
import { getAIClient, isAIAvailable, AI_MODEL, AI_MAX_TOKENS } from '../lib/ai'

const BIRTHDAY_WINDOW_DAYS = 30  // upozornit na narozeniny do 30 dní předem
const MAX_NEGLECTED = 10
const MAX_BIRTHDAYS = 5

function daysUntilMonthDay(monthDay: string): number | null {
  const m = monthDay.match(/^(\d{2})-(\d{2})$/)
  if (!m) return null
  const month = parseInt(m[1]) - 1
  const day = parseInt(m[2])
  const now = new Date()
  let next = new Date(now.getFullYear(), month, day)
  if (next < now) next = new Date(now.getFullYear() + 1, month, day)
  return Math.ceil((next.getTime() - now.getTime()) / 86400000)
}

export async function signalRoutes(app: FastifyInstance) {
  // GET /signal — přehled zanedbaných kontaktů + blížící se narozeniny
  app.get('/', { preHandler: authenticate }, async (request, reply) => {
    // 1. Zanedbané kontakty — déle než radar_days bez zápisku
    const neglected = await sql`
      SELECT
        c.id, c.first_name, c.last_name,
        cl.id   AS list_id,
        cl.name AS list_name, cl.color AS list_color, cl.radar_days,
        MAX(ce.event_date)::text AS last_event,
        CASE
          WHEN MAX(ce.event_date) IS NULL THEN NULL
          ELSE (NOW()::date - MAX(ce.event_date))::int
        END AS days_since
      FROM contacts c
      JOIN contact_lists cl ON cl.id = c.list_id
      LEFT JOIN contact_events ce ON ce.contact_id = c.id
      WHERE cl.user_id = ${request.userId}
      GROUP BY c.id, cl.id, cl.name, cl.color, cl.radar_days
      HAVING
        -- Má záznamy, ale poslední byl před víc než radar_days
        (MAX(ce.event_date) IS NOT NULL
          AND (NOW()::date - MAX(ce.event_date))::int >= cl.radar_days)
        OR
        -- Nemá žádný záznam, ale kontakt byl přidán před víc než radar_days (není nový)
        (MAX(ce.event_date) IS NULL
          AND (NOW()::date - c.created_at::date)::int >= cl.radar_days)
      ORDER BY days_since DESC NULLS FIRST
      LIMIT ${MAX_NEGLECTED}
    `

    // 2. Blížící se narozeniny (pole typu month_day)
    const birthdayFields = await sql`
      SELECT fd.name AS field_name, c.id, c.first_name, c.last_name,
             cl.id AS list_id, cl.name AS list_name, cl.color AS list_color,
             c.custom_data->>fd.name AS birthday_value
      FROM field_definitions fd
      JOIN contact_lists cl ON cl.id = fd.list_id
      JOIN contacts c ON c.list_id = fd.list_id
      WHERE cl.user_id = ${request.userId}
        AND fd.field_type = 'month_day'
        AND c.custom_data ? fd.name
        AND c.custom_data->>fd.name IS NOT NULL
        AND c.custom_data->>fd.name != ''
    `

    const birthdays = birthdayFields
      .map((r: any) => ({ ...r, days_until: daysUntilMonthDay(r.birthday_value) }))
      .filter((r: any) => r.days_until !== null && r.days_until <= BIRTHDAY_WINDOW_DAYS)
      .sort((a: any, b: any) => a.days_until - b.days_until)
      .slice(0, MAX_BIRTHDAYS)

    return reply.send({ neglected, birthdays })
  })

  // POST /signal/ai — AI analýza (spotřebuje 1 kredit)
  app.post('/ai', { preHandler: authenticate }, async (request, reply) => {
    if (!isAIAvailable()) {
      return reply.status(503).send({ error: 'AI asistent není momentálně k dispozici.' })
    }

    // Zkontroluj kredity
    const [userRow] = await sql`SELECT ai_credits, is_vip FROM users WHERE id = ${request.userId}`
    if (!userRow) return reply.status(404).send({ error: 'Uživatel nenalezen' })
    if (!userRow.is_vip && userRow.ai_credits <= 0) {
      return reply.status(402).send({ error: 'Nedostatek kreditů. Zakup si další v nastavení účtu.' })
    }

    // Načti přehled všech kontaktů s aktivitou
    const contacts = await sql`
      SELECT
        c.id, c.first_name, c.last_name,
        cl.name AS list_name, cl.radar_days,
        MAX(ce.event_date)::text AS last_event,
        CASE WHEN MAX(ce.event_date) IS NULL THEN NULL
             ELSE (NOW()::date - MAX(ce.event_date))::int END AS days_since
      FROM contacts c
      JOIN contact_lists cl ON cl.id = c.list_id
      LEFT JOIN contact_events ce ON ce.contact_id = c.id
      WHERE cl.user_id = ${request.userId}
      GROUP BY c.id, cl.name, cl.radar_days
      ORDER BY days_since DESC NULLS FIRST
      LIMIT 50
    `

    // Narozeniny
    const bdays = await sql`
      SELECT c.first_name, c.last_name, c.custom_data->>fd.name AS bday
      FROM field_definitions fd
      JOIN contact_lists cl ON cl.id = fd.list_id
      JOIN contacts c ON c.list_id = fd.list_id
      WHERE cl.user_id = ${request.userId}
        AND fd.field_type = 'month_day'
        AND c.custom_data->>fd.name IS NOT NULL
        AND c.custom_data->>fd.name != ''
    `

    const upcomingBdays = bdays
      .map((r: any) => ({ name: [r.first_name, r.last_name].filter(Boolean).join(' '), days: daysUntilMonthDay(r.bday) }))
      .filter((r: any) => r.days !== null && r.days <= 30)
      .sort((a: any, b: any) => a.days - b.days)

    // Sestav prompt
    const contactSummary = (contacts as any[]).map(c => {
      const name = [c.first_name, c.last_name].filter(Boolean).join(' ')
      const activity = c.last_event
        ? `naposledy ${c.last_event} (${c.days_since} dní)`
        : 'žádný záznam'
      return `- ${name} (${c.list_name}): ${activity}, práh: ${c.radar_days} dní`
    }).join('\n')

    const bdaySummary = upcomingBdays.length > 0
      ? upcomingBdays.map((b: any) => `- ${b.name}: za ${b.days} dní`).join('\n')
      : 'Žádné blížící se narozeniny.'

    const prompt = `Jsi asistent pro správu osobních vztahů. Uživatel má tyto kontakty a jejich poslední aktivitu:\n\n${contactSummary}\n\nBlížící se narozeniny (do 30 dní):\n${bdaySummary}\n\nNa základě těchto dat urči:\n1. TOP 3-5 kontaktů, které je třeba TENTO TÝDEN kontaktovat (s krátkým zdůvodněním proč)\n2. Jestli jsou narozeniny, upozorni na ně\n3. Navrhni konkrétní akci pro každý kontakt (zavolat, napsat zprávu, sejít se...)\n\nBuď stručný, konkrétní a osobní. Piš česky.`

    try {
      const client = getAIClient()
      const response = await client.messages.create({
        model: AI_MODEL,
        max_tokens: AI_MAX_TOKENS,
        messages: [{ role: 'user', content: prompt }],
      })

      const text = response.content
        .filter(b => b.type === 'text')
        .map(b => (b as any).text)
        .join('')

      // Odpočet kreditu
      if (!userRow.is_vip) {
        await sql`UPDATE users SET ai_credits = ai_credits - 1 WHERE id = ${request.userId}`
        await sql`INSERT INTO credit_transactions (user_id, type, credits, description)
                  VALUES (${request.userId}, 'usage', -1, 'Signál AI analýza')`
      }

      return reply.send({ analysis: text, credits_remaining: userRow.is_vip ? null : userRow.ai_credits - 1 })
    } catch (err) {
      request.log.error({ err }, 'Signal AI error')
      return reply.status(500).send({ error: 'AI asistent momentálně neodpovídá. Zkus to za chvíli.' })
    }
  })
}
