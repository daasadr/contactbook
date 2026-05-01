import Fastify from 'fastify'
import fastifyJwt from '@fastify/jwt'
import fastifyCookie from '@fastify/cookie'
import fastifyCors from '@fastify/cors'
import fastifyRateLimit from '@fastify/rate-limit'
import { config } from './config'
import { authRoutes } from './routes/auth'
import { listsRoutes } from './routes/lists'
import { contactsRoutes } from './routes/contacts'
import { fieldsRoutes } from './routes/fields'

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: config.NODE_ENV === 'production' ? 'warn' : 'info',
    },
    trustProxy: true,
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

  // Rate limiting — globálně + přísnější na auth endpointech
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

  return app
}
