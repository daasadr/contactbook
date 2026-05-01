import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { z } from 'zod'
import { sql } from '../db'

const BCRYPT_ROUNDS = 12
const ACCESS_TOKEN_TTL = '15m'
const REFRESH_TOKEN_DAYS = 30

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function authRoutes(app: FastifyInstance) {
  // POST /auth/register
  app.post('/register', async (request, reply) => {
    const body = registerSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Neplatná data', details: body.error.flatten().fieldErrors })
    }
    const { name, email, password } = body.data

    const existing = await sql`SELECT id FROM users WHERE email = ${email}`
    if (existing.length > 0) {
      return reply.status(409).send({ error: 'Uživatel s tímto e-mailem již existuje' })
    }

    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS)
    const [user] = await sql`
      INSERT INTO users (name, email, password_hash)
      VALUES (${name}, ${email}, ${password_hash})
      RETURNING id, name, email, created_at
    `

    const accessToken = app.jwt.sign({ id: user.id }, { expiresIn: ACCESS_TOKEN_TTL })
    const refreshToken = await issueRefreshToken(user.id)

    setRefreshCookie(reply, refreshToken)
    return reply.status(201).send({ user, accessToken })
  })

  // POST /auth/login
  app.post('/login', async (request, reply) => {
    const body = loginSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Neplatná data' })
    }
    const { email, password } = body.data

    const [user] = await sql`
      SELECT id, name, email, password_hash, created_at FROM users WHERE email = ${email}
    `
    if (!user) {
      return reply.status(401).send({ error: 'Nesprávný e-mail nebo heslo' })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return reply.status(401).send({ error: 'Nesprávný e-mail nebo heslo' })
    }

    await sql`UPDATE users SET last_login = NOW() WHERE id = ${user.id}`

    const accessToken = app.jwt.sign({ id: user.id }, { expiresIn: ACCESS_TOKEN_TTL })
    const refreshToken = await issueRefreshToken(user.id)

    setRefreshCookie(reply, refreshToken)
    const { password_hash: _, ...safeUser } = user
    return reply.send({ user: safeUser, accessToken })
  })

  // POST /auth/refresh
  app.post('/refresh', async (request, reply) => {
    const token = (request.cookies as Record<string, string>)['refresh_token']
    if (!token) {
      return reply.status(401).send({ error: 'Chybí refresh token' })
    }

    const tokenHash = hashToken(token)
    const [stored] = await sql`
      SELECT rt.user_id, u.name, u.email, u.created_at
      FROM refresh_tokens rt
      JOIN users u ON u.id = rt.user_id
      WHERE rt.token_hash = ${tokenHash} AND rt.expires_at > NOW()
    `
    if (!stored) {
      return reply.status(401).send({ error: 'Neplatný nebo expirovaný refresh token' })
    }

    // Rotace refresh tokenu
    await sql`DELETE FROM refresh_tokens WHERE token_hash = ${tokenHash}`
    const newRefreshToken = await issueRefreshToken(stored.user_id)
    const accessToken = app.jwt.sign({ id: stored.user_id }, { expiresIn: ACCESS_TOKEN_TTL })

    setRefreshCookie(reply, newRefreshToken)
    return reply.send({
      user: { id: stored.user_id, name: stored.name, email: stored.email, created_at: stored.created_at },
      accessToken,
    })
  })

  // POST /auth/logout
  app.post('/logout', async (request, reply) => {
    const token = (request.cookies as Record<string, string>)['refresh_token']
    if (token) {
      const tokenHash = hashToken(token)
      await sql`DELETE FROM refresh_tokens WHERE token_hash = ${tokenHash}`
    }
    reply.clearCookie('refresh_token', { path: '/auth' })
    return reply.send({ ok: true })
  })

  // GET /auth/me — ověření stavu přihlášení
  app.get('/me', async (request, reply) => {
    try {
      await request.jwtVerify()
      const payload = request.user as { id: string }
      const [user] = await sql`
        SELECT id, name, email, created_at, last_login FROM users WHERE id = ${payload.id}
      `
      if (!user) return reply.status(404).send({ error: 'Uživatel nenalezen' })
      return reply.send({ user })
    } catch {
      return reply.status(401).send({ error: 'Nepřihlášen' })
    }
  })
}

async function issueRefreshToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(48).toString('hex')
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 86400 * 1000)
  await sql`
    INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
    VALUES (${userId}, ${tokenHash}, ${expiresAt})
  `
  // Smazat staré expirované tokeny uživatele
  await sql`DELETE FROM refresh_tokens WHERE user_id = ${userId} AND expires_at < NOW()`
  return token
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setRefreshCookie(reply: any, token: string) {
  reply.setCookie('refresh_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/auth',
    maxAge: REFRESH_TOKEN_DAYS * 86400,
  })
}
