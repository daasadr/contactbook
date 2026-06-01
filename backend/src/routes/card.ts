import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import crypto from 'crypto'
import { sql } from '../db'
import { authenticate } from '../middleware/authenticate'
import { getAIClient, isAIAvailable, AI_MODEL } from '../lib/ai'

const cardSchema = z.object({
  name: z.string().max(100).optional(),
  title: z.string().max(150).optional(),
  company: z.string().max(150).optional(),
  tagline: z.string().max(300).optional(),
  email: z.string().email().max(255).optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  website: z.string().url().max(300).optional().or(z.literal('')),
  linkedin: z.string().max(300).optional(),
  twitter: z.string().max(150).optional(),
  location: z.string().max(100).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
})

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // remove diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30) || 'user'
  return `${base}-${crypto.randomBytes(3).toString('hex')}`
}

export async function cardRoutes(app: FastifyInstance) {
  // GET /card/me — načte vizitku přihlášeného uživatele
  app.get('/me', { preHandler: authenticate }, async (request, reply) => {
    const [user] = await sql`
      SELECT name, email, business_card, show_card_button, card_slug
      FROM users WHERE id = ${request.userId}
    `
    if (!user) return reply.status(404).send({ error: 'Uživatel nenalezen' })
    return reply.send({
      card: user.business_card ?? {},
      show_card_button: user.show_card_button,
      card_slug: user.card_slug,
      user_name: user.name,
      user_email: user.email,
    })
  })

  // PUT /card/me — uloží vizitku
  app.put('/me', { preHandler: authenticate }, async (request, reply) => {
    const body = z.object({
      card: cardSchema,
      show_card_button: z.boolean().optional(),
    }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Neplatná data' })

    const [user] = await sql`SELECT name, card_slug FROM users WHERE id = ${request.userId}`
    if (!user) return reply.status(404).send({ error: 'Uživatel nenalezen' })

    // Vygeneruj slug pokud ještě nemá
    let slug = user.card_slug
    if (!slug) {
      const cardName = body.data.card.name || user.name
      let candidate = generateSlug(cardName)
      // Ensure uniqueness
      while (true) {
        const [existing] = await sql`SELECT id FROM users WHERE card_slug = ${candidate}`
        if (!existing) { slug = candidate; break }
        candidate = generateSlug(cardName)
      }
    }

    const updates: Record<string, unknown> = {
      business_card: sql.json(body.data.card as any),
      card_slug: slug,
    }
    if (body.data.show_card_button !== undefined) {
      updates.show_card_button = body.data.show_card_button
    }

    const [updated] = await sql`
      UPDATE users SET ${sql(updates as any)} WHERE id = ${request.userId}
      RETURNING business_card, show_card_button, card_slug
    `
    return reply.send({
      card: updated.business_card,
      show_card_button: updated.show_card_button,
      card_slug: updated.card_slug,
    })
  })

  // POST /card/ai — AI vygeneruje obsah vizitky z profilu uživatele
  app.post('/ai', { preHandler: authenticate }, async (request, reply) => {
    if (!isAIAvailable()) return reply.status(503).send({ error: 'AI není k dispozici.' })

    const [user] = await sql`
      SELECT name, email, profile, business_card FROM users WHERE id = ${request.userId}
    `
    if (!user) return reply.status(404).send({ error: 'Uživatel nenalezen' })

    const profile = (user.profile ?? {}) as Record<string, string>
    const existing = (user.business_card ?? {}) as Record<string, string>

    const profileSummary = [
      profile.role && `Profese: ${profile.role}`,
      profile.about && `O sobě: ${profile.about}`,
      profile.values && `Hodnoty: ${profile.values}`,
      profile.goals && `Cíle: ${profile.goals}`,
      profile.strengths && `Silné stránky: ${profile.strengths}`,
      profile.interests && `Zájmy: ${profile.interests}`,
    ].filter(Boolean).join('\n') || '(profil není vyplněn)'

    const prompt = `Vytvoř obsah pro digitální vizitku aplikace Peopleworth pro uživatele ${user.name}.

Dostupné informace o uživateli:
${profileSummary}

Stávající vizitka (pro kontext):
${Object.entries(existing).map(([k,v]) => `${k}: ${v}`).join('\n') || '(prázdná)'}

Vytvoř JSON objekt s těmito poli (vyplň jen ta, pro která máš dostatečný základ):
{
  "title": "profesní titul/pozice (max 60 znaků)",
  "tagline": "krátký poutavý popis v první osobě (max 120 znaků) — co tě vystihuje, co přinášíš světu",
  "company": "firma/organizace (pokud lze odvodit)"
}

Pravidla:
- Tagline musí být autentický, osobní a zapamatovatelný — ne generický
- Vycházej POUZE z toho, co uživatel uvedl — nevymýšlej fakta
- Odpověz POUZE JSON, nic jiného`

    try {
      const client = getAIClient()
      const response = await client.messages.create({
        model: AI_MODEL,
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      })
      const text = response.content.filter(b => b.type === 'text').map(b => (b as any).text).join('').trim()
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return reply.status(422).send({ error: 'AI nedokázala vygenerovat vizitku. Vyplň svůj profil v nastavení.' })
      const generated = JSON.parse(jsonMatch[0])
      return reply.send({ generated })
    } catch {
      return reply.status(500).send({ error: 'AI momentálně neodpovídá.' })
    }
  })

  // GET /card/:slug — veřejná vizitka (bez autentikace)
  app.get('/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string }
    const [user] = await sql`
      SELECT name, email, business_card, card_slug
      FROM users WHERE card_slug = ${slug}
    `
    if (!user) return reply.status(404).send({ error: 'Vizitka nenalezena' })
    const card = user.business_card ?? {}
    return reply.send({
      card: { ...card, name: (card as any).name || user.name },
      slug: user.card_slug,
    })
  })
}
