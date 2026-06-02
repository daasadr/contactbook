import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { sql } from '../db'
import { config } from '../config'

const adminRateLimit = { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }

export async function adminRoutes(app: FastifyInstance) {
  // Middleware — všechny admin routes vyžadují X-Admin-Secret header
  app.addHook('preHandler', async (request, reply) => {
    if (!config.ADMIN_SECRET) {
      return reply.status(503).send({ error: 'Admin rozhraní není aktivní.' })
    }
    if (request.headers['x-admin-secret'] !== config.ADMIN_SECRET) {
      // Zpomalení při neplatném klíči
      await new Promise(r => setTimeout(r, 500))
      return reply.status(403).send({ error: 'Neplatný admin klíč.' })
    }
  })

  // POST /admin/set-vip — nastaví VIP status uživateli podle emailu
  app.post('/set-vip', async (request, reply) => {
    const body = z.object({
      email: z.string().email(),
      vip: z.boolean().default(true),
    }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Neplatná data' })

    const [user] = await sql`
      UPDATE users SET is_vip = ${body.data.vip}
      WHERE email = ${body.data.email}
      RETURNING id, email, is_vip
    `
    if (!user) return reply.status(404).send({ error: 'Uživatel nenalezen' })
    return reply.send({ user })
  })

  // POST /admin/add-credits — přidá kredity uživateli
  app.post('/add-credits', async (request, reply) => {
    const body = z.object({
      email: z.string().email(),
      credits: z.number().int().min(1).max(10000),
    }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Neplatná data' })

    const [user] = await sql`
      UPDATE users SET ai_credits = ai_credits + ${body.data.credits}
      WHERE email = ${body.data.email}
      RETURNING id, email, ai_credits
    `
    if (!user) return reply.status(404).send({ error: 'Uživatel nenalezen' })

    await sql`
      INSERT INTO credit_transactions (user_id, type, credits, description)
      VALUES (${user.id}, 'gift', ${body.data.credits}, 'Admin gift')
    `
    return reply.send({ user })
  })

  // GET /admin/users — přehled uživatelů
  app.get('/users', async (_request, reply) => {
    const users = await sql`
      SELECT id, email, name, ai_credits, is_vip, created_at, last_login
      FROM users ORDER BY created_at DESC
    `
    return reply.send({ users })
  })
}
