import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { z } from 'zod'
import { sql } from '../db'
import { config } from '../config'
import { sendEmail, passwordResetEmailHtml } from '../lib/email'
import { authenticate } from '../middleware/authenticate'

const BCRYPT_ROUNDS = 12
const ACCESS_TOKEN_TTL = '15m'
const REFRESH_TOKEN_DAYS = 30
const PASSWORD_RESET_MINUTES = 60

const strongPasswordSchema = z
  .string()
  .min(8, 'Heslo musí mít alespoň 8 znaků')
  .max(128, 'Heslo je příliš dlouhé')
  .regex(/[A-Z]/, 'Heslo musí obsahovat alespoň jedno velké písmeno')
  .regex(/[a-z]/, 'Heslo musí obsahovat alespoň jedno malé písmeno')
  .regex(/[0-9]/, 'Heslo musí obsahovat alespoň jednu číslici')
  .regex(/[^A-Za-z0-9]/, 'Heslo musí obsahovat alespoň jeden speciální znak (!, @, #, $ …)')

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: strongPasswordSchema,
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: strongPasswordSchema,
})

const authRateLimit = { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } }

export async function authRoutes(app: FastifyInstance) {
  // POST /auth/register
  app.post('/register', authRateLimit, async (request, reply) => {
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
  app.post('/login', authRateLimit, async (request, reply) => {
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

  // POST /auth/forgot-password
  app.post('/forgot-password', authRateLimit, async (request, reply) => {
    const body = forgotPasswordSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Neplatný e-mail' })
    }

    const [user] = await sql`SELECT id, name FROM users WHERE email = ${body.data.email}`

    // Always respond ok — don't leak whether the email is registered
    if (!user) return reply.send({ ok: true })

    // Delete any existing reset tokens for this user
    await sql`DELETE FROM password_reset_tokens WHERE user_id = ${user.id}`

    const token = crypto.randomBytes(48).toString('hex')
    const tokenHash = hashToken(token)
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_MINUTES * 60 * 1000)

    await sql`
      INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
      VALUES (${user.id}, ${tokenHash}, ${expiresAt})
    `

    const resetUrl = `${config.APP_URL}/reset-password?token=${token}`
    try {
      await sendEmail({
        to: body.data.email,
        subject: 'Resetování hesla — Peopleworth',
        html: passwordResetEmailHtml(user.name, resetUrl),
      })
    } catch (err) {
      request.log.error({ err }, 'Odeslání reset e-mailu selhalo')
    }

    return reply.send({ ok: true })
  })

  // POST /auth/reset-password
  app.post('/reset-password', authRateLimit, async (request, reply) => {
    const body = resetPasswordSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Neplatná data', details: body.error.flatten().fieldErrors })
    }

    const tokenHash = hashToken(body.data.token)
    const [resetToken] = await sql`
      SELECT id, user_id FROM password_reset_tokens
      WHERE token_hash = ${tokenHash}
        AND expires_at > NOW()
        AND used_at IS NULL
    `
    if (!resetToken) {
      return reply.status(400).send({ error: 'Odkaz pro reset hesla je neplatný nebo vypršel.' })
    }

    const password_hash = await bcrypt.hash(body.data.password, BCRYPT_ROUNDS)
    await sql`UPDATE users SET password_hash = ${password_hash} WHERE id = ${resetToken.user_id}`
    await sql`UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ${resetToken.id}`
    // Invalidate all sessions
    await sql`DELETE FROM refresh_tokens WHERE user_id = ${resetToken.user_id}`

    return reply.send({ ok: true })
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
    reply.clearCookie('refresh_token', { path: '/' })
    return reply.send({ ok: true })
  })

  // DELETE /auth/account — GDPR právo na výmaz (vyžaduje potvrzení heslem)
  app.delete('/account', { preHandler: authenticate }, async (request, reply) => {
    const body = z.object({ password: z.string().min(1) }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Neplatná data' })

    const [user] = await sql`SELECT password_hash FROM users WHERE id = ${request.userId}`
    if (!user) return reply.status(404).send({ error: 'Uživatel nenalezen' })

    const valid = await bcrypt.compare(body.data.password, user.password_hash)
    if (!valid) return reply.status(403).send({ error: 'Nesprávné heslo' })

    await sql`DELETE FROM users WHERE id = ${request.userId}`
    reply.clearCookie('refresh_token', { path: '/' })
    return reply.send({ ok: true })
  })

  // GET /auth/export — GDPR právo na přenositelnost dat
  app.get('/export', { preHandler: authenticate }, async (request, reply) => {
    const [user] = await sql`
      SELECT id, email, name, created_at, last_login FROM users WHERE id = ${request.userId}
    `

    const lists = await sql`
      SELECT id, name, description, template_type, created_at FROM contact_lists
      WHERE user_id = ${request.userId} ORDER BY created_at ASC
    `

    const exportLists = []
    for (const list of lists) {
      const contacts = await sql`
        SELECT id, first_name, last_name, custom_data, is_starred, created_at
        FROM contacts WHERE list_id = ${list.id} ORDER BY created_at ASC
      `
      const exportContacts = []
      for (const contact of contacts) {
        const events = await sql`
          SELECT id, title, content, event_date, tags, created_at
          FROM contact_events WHERE contact_id = ${contact.id} ORDER BY event_date DESC
        `
        const connections = await sql`
          SELECT
            CASE WHEN r.contact_a_id = ${contact.id} THEN b.first_name ELSE a.first_name END AS first_name,
            CASE WHEN r.contact_a_id = ${contact.id} THEN b.last_name  ELSE a.last_name  END AS last_name,
            r.label
          FROM contact_relationships r
          JOIN contacts a ON a.id = r.contact_a_id
          JOIN contacts b ON b.id = r.contact_b_id
          WHERE r.contact_a_id = ${contact.id} OR r.contact_b_id = ${contact.id}
        `
        exportContacts.push({ ...contact, events, connections })
      }
      exportLists.push({ ...list, contacts: exportContacts })
    }

    reply.header('Content-Disposition', 'attachment; filename="peopleworth-export.json"')
    return reply.send({ exportDate: new Date().toISOString(), user, lists: exportLists })
  })

  // GET /auth/profile — načte profil uživatele pro AI
  app.get('/profile', { preHandler: authenticate }, async (request, reply) => {
    const [user] = await sql`SELECT profile FROM users WHERE id = ${request.userId}`
    if (!user) return reply.status(404).send({ error: 'Uživatel nenalezen' })
    return reply.send({ profile: user.profile ?? {} })
  })

  // PATCH /auth/profile — uloží profil uživatele
  app.patch('/profile', { preHandler: authenticate }, async (request, reply) => {
    const body = z.object({
      role: z.string().max(200).optional(),
      values: z.string().max(1000).optional(),
      goals: z.string().max(1000).optional(),
      communication_style: z.string().max(500).optional(),
      strengths: z.string().max(500).optional(),
      challenges: z.string().max(500).optional(),
      interests: z.string().max(500).optional(),
      about: z.string().max(2000).optional(),
    }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Neplatná data' })

    // Merge s existujícím profilem
    const [user] = await sql`SELECT profile FROM users WHERE id = ${request.userId}`
    const merged = { ...(user?.profile ?? {}), ...body.data }
    const [updated] = await sql`
      UPDATE users SET profile = ${sql.json(merged as any)} WHERE id = ${request.userId}
      RETURNING profile
    `
    return reply.send({ profile: updated.profile })
  })

  // GET /auth/me
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
    path: '/',
    maxAge: REFRESH_TOKEN_DAYS * 86400,
  })
}
