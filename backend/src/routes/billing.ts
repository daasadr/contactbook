import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import Stripe from 'stripe'
import { sql } from '../db'
import { authenticate } from '../middleware/authenticate'
import { config } from '../config'

export const CREDIT_PACKS = [
  { id: 'starter',  credits: 50,  price_cents: 199,  label: '50 kreditů',  note: '~50 AI dotazů' },
  { id: 'standard', credits: 200, price_cents: 599,  label: '200 kreditů', note: '~200 AI dotazů' },
  { id: 'pro',      credits: 500, price_cents: 1199, label: '500 kreditů', note: '~500 AI dotazů' },
]

function getStripe() {
  if (!config.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY není nastaven')
  return new Stripe(config.STRIPE_SECRET_KEY)
}

export async function billingRoutes(app: FastifyInstance) {
  // GET /billing/balance — aktuální počet kreditů
  app.get('/balance', { preHandler: authenticate }, async (request, reply) => {
    const [user] = await sql`SELECT ai_credits FROM users WHERE id = ${request.userId}`
    if (!user) return reply.status(404).send({ error: 'Uživatel nenalezen' })
    return reply.send({ credits: user.ai_credits })
  })

  // GET /billing/packs — dostupné balíčky
  app.get('/packs', async (_request, reply) => {
    return reply.send({ packs: CREDIT_PACKS, stripe_enabled: !!config.STRIPE_SECRET_KEY })
  })

  // POST /billing/checkout/credits — vytvoří Stripe Checkout pro kredity
  app.post('/checkout/credits', { preHandler: authenticate }, async (request, reply) => {
    if (!config.STRIPE_SECRET_KEY) {
      return reply.status(503).send({ error: 'Platby nejsou momentálně k dispozici.' })
    }
    const body = z.object({ pack_id: z.string() }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Neplatná data' })

    const pack = CREDIT_PACKS.find(p => p.id === body.data.pack_id)
    if (!pack) return reply.status(400).send({ error: 'Neznámý balíček' })

    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          unit_amount: pack.price_cents,
          product_data: {
            name: `${pack.label} — Peopleworth AI`,
            description: pack.note,
          },
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${config.APP_URL}/settings?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.APP_URL}/settings?payment=cancelled`,
      metadata: {
        user_id: request.userId,
        type: 'credits',
        credits: pack.credits.toString(),
        pack_id: pack.id,
      },
    })

    return reply.send({ url: session.url })
  })

  // POST /billing/checkout/donation — vytvoří Stripe Checkout pro donaci
  app.post('/checkout/donation', { preHandler: authenticate }, async (request, reply) => {
    if (!config.STRIPE_SECRET_KEY) {
      return reply.status(503).send({ error: 'Platby nejsou momentálně k dispozici.' })
    }
    const body = z.object({
      amount_eur: z.number().min(1).max(500),
    }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Neplatná částka' })

    const stripe = getStripe()
    const amount_cents = Math.round(body.data.amount_eur * 100)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          unit_amount: amount_cents,
          product_data: {
            name: 'Podpora vývoje Peopleworth',
            description: 'Děkuji za podporu! ❤️',
          },
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${config.APP_URL}/settings?payment=donated`,
      cancel_url: `${config.APP_URL}/settings?payment=cancelled`,
      metadata: {
        user_id: request.userId,
        type: 'donation',
        amount_cents: amount_cents.toString(),
      },
    })

    return reply.send({ url: session.url })
  })

  // POST /billing/complete — ověří dokončenou Stripe session a přičte kredity
  app.post('/complete', { preHandler: authenticate }, async (request, reply) => {
    if (!config.STRIPE_SECRET_KEY) {
      return reply.status(503).send({ error: 'Platby nejsou momentálně k dispozici.' })
    }
    const body = z.object({ session_id: z.string().min(1) }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Neplatná data' })

    const sessionId = body.data.session_id

    // Idempotence — pokud jsme tuto session už zpracovali, vrátíme aktuální stav
    const [existing] = await sql`
      SELECT id FROM credit_transactions WHERE stripe_session_id = ${sessionId}
    `
    if (existing) {
      const [user] = await sql`SELECT ai_credits FROM users WHERE id = ${request.userId}`
      return reply.send({ credits: user.ai_credits, already_processed: true })
    }

    // Ověř session u Stripe
    const stripe = getStripe()
    let session: Awaited<ReturnType<typeof stripe.checkout.sessions.retrieve>>
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId)
    } catch {
      return reply.status(400).send({ error: 'Neplatná platební session.' })
    }

    if (session.payment_status !== 'paid') {
      return reply.status(402).send({ error: 'Platba nebyla dokončena.' })
    }

    // Ověř, že session patří tomuto uživateli
    if (session.metadata?.user_id !== request.userId) {
      return reply.status(403).send({ error: 'Neplatná session.' })
    }

    const type = session.metadata?.type
    const credits = type === 'credits' ? parseInt(session.metadata?.credits ?? '0') : 0
    const amountCents = parseInt(session.metadata?.amount_cents ?? session.amount_total?.toString() ?? '0')

    await sql.begin(async sql => {
      if (credits > 0) {
        await sql`UPDATE users SET ai_credits = ai_credits + ${credits} WHERE id = ${request.userId}`
      }
      await sql`
        INSERT INTO credit_transactions (user_id, type, credits, amount_cents, stripe_session_id, description)
        VALUES (
          ${request.userId},
          ${type ?? 'purchase'},
          ${credits},
          ${amountCents},
          ${sessionId},
          ${type === 'donation' ? 'Donace programátorovi' : `Nákup ${credits} kreditů`}
        )
      `
    })

    const [user] = await sql`SELECT ai_credits FROM users WHERE id = ${request.userId}`
    return reply.send({ credits: user.ai_credits })
  })

  // GET /billing/history — posledních 20 transakcí
  app.get('/history', { preHandler: authenticate }, async (request, reply) => {
    const transactions = await sql`
      SELECT type, credits, amount_cents, description, created_at
      FROM credit_transactions
      WHERE user_id = ${request.userId}
      ORDER BY created_at DESC
      LIMIT 20
    `
    return reply.send({ transactions })
  })
}
