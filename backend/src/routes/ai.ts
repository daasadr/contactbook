import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { sql } from '../db'
import { authenticate } from '../middleware/authenticate'
import { getAIClient, isAIAvailable, buildContactSystemPrompt, AI_MODEL, AI_MAX_TOKENS } from '../lib/ai'

const chatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1).max(4000),
  })).min(1).max(20),
})

const aiRateLimit = {
  config: { rateLimit: { max: 30, timeWindow: '1 hour' } },
}

export async function aiRoutes(app: FastifyInstance) {
  // GET /ai/status — zda je AI dostupné
  app.get('/status', { preHandler: authenticate }, async (_request, reply) => {
    return reply.send({ available: isAIAvailable() })
  })

  // POST /ai/contacts/:contactId/chat — microchat pro konkrétní kontakt
  app.post('/contacts/:contactId/chat', { preHandler: authenticate, ...aiRateLimit }, async (request, reply) => {
    if (!isAIAvailable()) {
      return reply.status(503).send({ error: 'Funkce AI asistenta není momentálně k dispozici.' })
    }

    const { contactId } = request.params as { contactId: string }

    const body = chatSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Neplatná data', details: body.error.flatten().fieldErrors })
    }

    // Načti kontakt + ověř vlastnictví přes seznam
    const [contact] = await sql`
      SELECT c.*, cl.name AS list_name, cl.id AS list_id
      FROM contacts c
      JOIN contact_lists cl ON cl.id = c.list_id
      WHERE c.id = ${contactId} AND cl.user_id = ${request.userId}
    `
    if (!contact) {
      return reply.status(404).send({ error: 'Kontakt nenalezen' })
    }

    // Načti definice polí
    const fields = await sql`
      SELECT name, label, field_type FROM field_definitions
      WHERE list_id = ${contact.list_id}
      ORDER BY sort_order ASC
    `

    // Načti záznamy ze setkání (max 40, nejnovější první)
    const events = await sql`
      SELECT title, content, event_date, tags
      FROM contact_events
      WHERE contact_id = ${contactId}
      ORDER BY event_date DESC
      LIMIT 40
    `

    // Načti propojení (kdo koho zná)
    const connectionRows = await sql`
      SELECT
        CASE WHEN r.contact_a_id = ${contactId} THEN b.first_name ELSE a.first_name END AS first_name,
        CASE WHEN r.contact_a_id = ${contactId} THEN b.last_name  ELSE a.last_name  END AS last_name,
        CASE WHEN r.contact_a_id = ${contactId} THEN bl.name      ELSE al.name      END AS list_name,
        r.label
      FROM contact_relationships r
      JOIN contacts a  ON a.id  = r.contact_a_id
      JOIN contacts b  ON b.id  = r.contact_b_id
      JOIN contact_lists al ON al.id = a.list_id
      JOIN contact_lists bl ON bl.id = b.list_id
      WHERE r.contact_a_id = ${contactId} OR r.contact_b_id = ${contactId}
    `
    const connections = connectionRows.map(r => ({
      name: [r.first_name, r.last_name].filter(Boolean).join(' '),
      listName: r.list_name as string,
      label: r.label as string | null,
    }))

    // Sestavení mapy pole → hodnota s labelem
    const customData = (contact.custom_data ?? {}) as Record<string, unknown>
    const fieldData: Record<string, { label: string; value: unknown; type: string }> = {}
    for (const f of fields) {
      const val = customData[f.name]
      if (val !== undefined) {
        fieldData[f.name] = { label: f.label, value: val, type: f.field_type }
      }
    }

    const contactName = [contact.first_name, contact.last_name].filter(Boolean).join(' ')
    const systemPrompt = buildContactSystemPrompt({
      contactName,
      fieldData,
      events: events as any[],
      listName: contact.list_name,
      connections,
    })

    // Zkontroluj kredity
    const [userCredits] = await sql`SELECT ai_credits FROM users WHERE id = ${request.userId}`
    if (!userCredits || userCredits.ai_credits <= 0) {
      return reply.status(402).send({ error: 'Nedostatek kreditů. Zakup si další v nastavení účtu.' })
    }

    try {
      const client = getAIClient()
      const response = await client.messages.create({
        model: AI_MODEL,
        max_tokens: AI_MAX_TOKENS,
        system: systemPrompt,
        messages: body.data.messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
      })

      const text = response.content
        .filter(b => b.type === 'text')
        .map(b => (b as { type: 'text'; text: string }).text)
        .join('')

      // Odpočet 1 kreditu po úspěšné odpovědi
      await sql`UPDATE users SET ai_credits = ai_credits - 1 WHERE id = ${request.userId}`
      await sql`
        INSERT INTO credit_transactions (user_id, type, credits, description)
        VALUES (${request.userId}, 'usage', -1, 'AI chat')
      `

      return reply.send({ reply: text, credits_remaining: userCredits.ai_credits - 1 })
    } catch (err: unknown) {
      request.log.error({ err }, 'AI chat error')
      return reply.status(500).send({ error: 'AI asistent momentálně neodpovídá. Zkus to za chvíli.' })
    }
  })

  // POST /ai/contacts/:contactId/chats — uložit konverzaci
  app.post('/contacts/:contactId/chats', { preHandler: authenticate }, async (request, reply) => {
    const { contactId } = request.params as { contactId: string }

    const body = z.object({
      title: z.string().min(1).max(200),
      messages: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(4000),
      })).min(2),
    }).safeParse(request.body)

    if (!body.success) return reply.status(400).send({ error: 'Neplatná data' })

    const [contact] = await sql`
      SELECT c.id FROM contacts c
      JOIN contact_lists cl ON cl.id = c.list_id
      WHERE c.id = ${contactId} AND cl.user_id = ${request.userId}
    `
    if (!contact) return reply.status(404).send({ error: 'Kontakt nenalezen' })

    const [chat] = await sql`
      INSERT INTO saved_ai_chats (user_id, contact_id, title, messages)
      VALUES (${request.userId}, ${contactId}, ${body.data.title}, ${sql.json(body.data.messages as any)})
      RETURNING id, title, created_at
    `
    return reply.status(201).send({ chat })
  })

  // GET /ai/contacts/:contactId/chats — seznam uložených konverzací
  app.get('/contacts/:contactId/chats', { preHandler: authenticate }, async (request, reply) => {
    const { contactId } = request.params as { contactId: string }

    const [contact] = await sql`
      SELECT c.id FROM contacts c
      JOIN contact_lists cl ON cl.id = c.list_id
      WHERE c.id = ${contactId} AND cl.user_id = ${request.userId}
    `
    if (!contact) return reply.status(404).send({ error: 'Kontakt nenalezen' })

    const chats = await sql`
      SELECT id, title, created_at,
             jsonb_array_length(messages) AS message_count
      FROM saved_ai_chats
      WHERE contact_id = ${contactId} AND user_id = ${request.userId}
      ORDER BY created_at DESC
    `
    return reply.send({ chats })
  })

  // GET /ai/chats/:chatId — detail uložené konverzace
  app.get('/chats/:chatId', { preHandler: authenticate }, async (request, reply) => {
    const { chatId } = request.params as { chatId: string }
    const [chat] = await sql`
      SELECT id, title, messages, created_at, contact_id
      FROM saved_ai_chats
      WHERE id = ${chatId} AND user_id = ${request.userId}
    `
    if (!chat) return reply.status(404).send({ error: 'Konverzace nenalezena' })
    return reply.send({ chat })
  })

  // DELETE /ai/chats/:chatId — smazat uloženou konverzaci
  app.delete('/chats/:chatId', { preHandler: authenticate }, async (request, reply) => {
    const { chatId } = request.params as { chatId: string }
    const [chat] = await sql`
      SELECT id FROM saved_ai_chats WHERE id = ${chatId} AND user_id = ${request.userId}
    `
    if (!chat) return reply.status(404).send({ error: 'Konverzace nenalezena' })
    await sql`DELETE FROM saved_ai_chats WHERE id = ${chatId}`
    return reply.send({ ok: true })
  })
}
