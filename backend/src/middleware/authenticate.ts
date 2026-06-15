import type { FastifyRequest, FastifyReply } from 'fastify'
import { sql } from '../db'

// JWT check only — use for routes that must work before email verification (e.g. resend-verification)
export async function authenticateBase(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
    const payload = request.user as { id: string }
    request.userId = payload.id
  } catch {
    reply.status(401).send({ error: 'Přístup odepřen — přihlaste se prosím' })
  }
}

// JWT check + email_verified — use for all content routes
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
    const payload = request.user as { id: string }
    request.userId = payload.id

    const [user] = await sql`SELECT email_verified FROM users WHERE id = ${payload.id}`
    if (!user?.email_verified) {
      return reply.status(403).send({ error: 'E-mail není ověřen. Zkontroluj svou schránku.' })
    }
  } catch {
    reply.status(401).send({ error: 'Přístup odepřen — přihlaste se prosím' })
  }
}
