import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../middleware/authenticate'
import { getAIClient, isAIAvailable, AI_MODEL } from '../lib/ai'

export async function namedayRoutes(app: FastifyInstance) {
  // POST /name-day — zjisti svátek pro české jméno
  app.post('/', { preHandler: authenticate }, async (request, reply) => {
    if (!isAIAvailable()) {
      return reply.status(503).send({ error: 'AI není momentálně k dispozici.' })
    }

    const body = z.object({ name: z.string().min(1).max(100) }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Neplatné jméno' })

    const name = body.data.name.trim()

    try {
      const client = getAIClient()
      const response = await client.messages.create({
        model: AI_MODEL,
        max_tokens: 20,
        messages: [{
          role: 'user',
          content: `Kdy má jméno "${name}" svátek v České republice? Odpověz POUZE ve formátu MM-DD (příklad: 03-14). Pokud má jméno více svátků, uveď první. Pokud jméno v českém kalendáři neexistuje, odpověz přesně: nenalezeno`,
        }],
      })

      const text = response.content
        .filter(b => b.type === 'text')
        .map(b => (b as any).text)
        .join('')
        .trim()

      const dateMatch = text.match(/^(\d{2})-(\d{2})$/)
      if (dateMatch) {
        return reply.send({ date: text, name })
      }
      return reply.send({ date: null, name })
    } catch (err) {
      request.log.error({ err }, 'Name day lookup error')
      return reply.status(500).send({ error: 'Chyba při vyhledávání.' })
    }
  })
}
