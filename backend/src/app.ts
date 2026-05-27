import Fastify from 'fastify'
import fastifyJwt from '@fastify/jwt'
import fastifyCookie from '@fastify/cookie'
import fastifyCors from '@fastify/cors'
import fastifyRateLimit from '@fastify/rate-limit'
import fastifyHelmet from '@fastify/helmet'
import { config } from './config'
import { authRoutes } from './routes/auth'
import { listsRoutes } from './routes/lists'
import { contactsRoutes } from './routes/contacts'
import { fieldsRoutes } from './routes/fields'
import { aiRoutes } from './routes/ai'

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

  return app
}
