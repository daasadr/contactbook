import Fastify from 'fastify'
import fastifyJwt from '@fastify/jwt'
import fastifyCookie from '@fastify/cookie'
import fastifyCors from '@fastify/cors'
import fastifyRateLimit from '@fastify/rate-limit'
import fastifyHelmet from '@fastify/helmet'
import fastifyMultipart from '@fastify/multipart'
import fs from 'fs'
import { config } from './config'

export const UPLOADS_DIR = process.env.UPLOADS_DIR || '/app/uploads'

// Ensure uploads directory exists at startup
fs.mkdirSync(UPLOADS_DIR, { recursive: true })
import { sql } from './db'
import { authenticate } from './middleware/authenticate'
import { authRoutes } from './routes/auth'
import { listsRoutes } from './routes/lists'
import { contactsRoutes } from './routes/contacts'
import { fieldsRoutes } from './routes/fields'
import { aiRoutes } from './routes/ai'
import { relationshipsRoutes } from './routes/relationships'
import { eventsRoutes } from './routes/events'
import { billingRoutes } from './routes/billing'
import { adminRoutes } from './routes/admin'
import { tasksRoutes } from './routes/tasks'
import { signalRoutes } from './routes/signal'
import { namedayRoutes } from './routes/nameday'
import { extractRoutes } from './routes/extract'
import { cardRoutes } from './routes/card'

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: config.NODE_ENV === 'production' ? 'warn' : 'info',
    },
    trustProxy: true,
    bodyLimit: 10 * 1024 * 1024, // 10 MB
  })

  // Security headers
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: false, // CSP is handled by nginx for the SPA
    crossOriginResourcePolicy: { policy: 'same-site' },
  })

  // CORS
  await app.register(fastifyCors, {
    origin: config.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })

  // Cookies
  await app.register(fastifyCookie)

  // JWT
  await app.register(fastifyJwt, {
    secret: config.JWT_SECRET,
    sign: { algorithm: 'HS256' },
  })

  // Multipart (file uploads) — 10 MB limit per file
  await app.register(fastifyMultipart, {
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  })

  // Rate limiting — 200 req/min globally; auth routes use stricter per-route limits
  await app.register(fastifyRateLimit, {
    max: 200,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      error: 'Příliš mnoho požadavků — zkuste to za chvíli',
    }),
  })

  // Health check
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

  // Routes
  await app.register(authRoutes, { prefix: '/auth' })
  await app.register(listsRoutes, { prefix: '/lists' })
  await app.register(contactsRoutes, { prefix: '/lists' })
  await app.register(fieldsRoutes, { prefix: '/lists' })
  await app.register(aiRoutes, { prefix: '/ai' })
  await app.register(relationshipsRoutes, { prefix: '/relationships' })
  await app.register(eventsRoutes, { prefix: '/lists' })
  await app.register(billingRoutes, { prefix: '/billing' })
  await app.register(adminRoutes, { prefix: '/admin' })
  await app.register(tasksRoutes, { prefix: '/tasks' })
  await app.register(signalRoutes, { prefix: '/signal' })
  await app.register(namedayRoutes, { prefix: '/name-day' })
  await app.register(extractRoutes, { prefix: '/extract' })
  await app.register(cardRoutes, { prefix: '/card' })

  // GET /contacts/all — všechny kontakty uživatele (pro výběr v úkolech)
  app.get('/contacts/all', { preHandler: authenticate }, async (request, reply) => {
    const contacts = await sql`
      SELECT c.id, c.first_name, c.last_name, cl.id AS list_id, cl.name AS list_name
      FROM contacts c
      JOIN contact_lists cl ON cl.id = c.list_id
      WHERE cl.user_id = ${request.userId}
      ORDER BY cl.name ASC, c.first_name ASC, c.last_name ASC
    `
    return reply.send({ contacts })
  })

  return app
}
