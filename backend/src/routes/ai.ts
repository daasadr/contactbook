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
      return reply.status(503).send({ error: 'AI asistent není nakonfigurován.' })
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
    })

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

      return reply.send({ reply: text })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Neznámá chyba'
      request.log.error({ err }, 'AI chat error')
      return reply.status(500).send({ error: `AI odpověď selhala: ${msg}` })
    }
  })
}
