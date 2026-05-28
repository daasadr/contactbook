import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { sql } from '../db'
import { authenticate } from '../middleware/authenticate'

const addSchema = z.object({
  other_contact_id: z.string().uuid(),
  label: z.string().max(100).optional(),
})

function normalizePair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a]
}

async function assertContactOwnership(contactId: string, userId: string, sqlConn: typeof sql) {
  const [row] = await sqlConn`
    SELECT c.id FROM contacts c
    JOIN contact_lists cl ON cl.id = c.list_id
    WHERE c.id = ${contactId} AND cl.user_id = ${userId}
  `
  return !!row
}

export async function relationshipsRoutes(app: FastifyInstance) {
  // GET /relationships/search?q=&exclude= — hledání kontaktů přes všechny seznamy uživatele
  app.get('/search', { preHandler: authenticate }, async (request, reply) => {
    const { q, exclude } = request.query as { q?: string; exclude?: string }
    const search = q?.trim() ?? ''
    if (search.length < 2) return reply.send({ contacts: [] })

    const contacts = await sql`
      SELECT c.id, c.first_name, c.last_name, c.custom_data,
             cl.id AS list_id, cl.name AS list_name
      FROM contacts c
      JOIN contact_lists cl ON cl.id = c.list_id
      WHERE cl.user_id = ${request.userId}
        ${exclude ? sql`AND c.id != ${exclude}` : sql``}
        AND (
          c.first_name ILIKE ${'%' + search + '%'}
          OR c.last_name ILIKE ${'%' + search + '%'}
        )
      ORDER BY c.first_name ASC, c.last_name ASC
      LIMIT 10
    `
    return reply.send({ contacts })
  })

  // GET /relationships/:contactId — všechna propojení kontaktu
  app.get('/:contactId', { preHandler: authenticate }, async (request, reply) => {
    const { contactId } = request.params as { contactId: string }

    if (!(await assertContactOwnership(contactId, request.userId, sql))) {
      return reply.status(404).send({ error: 'Kontakt nenalezen' })
    }

    const rows = await sql`
      SELECT
        r.id, r.label, r.created_at,
        CASE WHEN r.contact_a_id = ${contactId} THEN b.id    ELSE a.id    END AS other_id,
        CASE WHEN r.contact_a_id = ${contactId} THEN b.first_name ELSE a.first_name END AS other_first_name,
        CASE WHEN r.contact_a_id = ${contactId} THEN b.last_name  ELSE a.last_name  END AS other_last_name,
        CASE WHEN r.contact_a_id = ${contactId} THEN bl.id   ELSE al.id   END AS other_list_id,
        CASE WHEN r.contact_a_id = ${contactId} THEN bl.name ELSE al.name END AS other_list_name
      FROM contact_relationships r
      JOIN contacts a  ON a.id  = r.contact_a_id
      JOIN contacts b  ON b.id  = r.contact_b_id
      JOIN contact_lists al ON al.id = a.list_id
      JOIN contact_lists bl ON bl.id = b.list_id
      WHERE r.contact_a_id = ${contactId} OR r.contact_b_id = ${contactId}
      ORDER BY r.created_at DESC
    `

    const relationships = rows.map(r => ({
      id: r.id,
      label: r.label,
      created_at: r.created_at,
      other_contact: {
        id: r.other_id,
        first_name: r.other_first_name,
        last_name: r.other_last_name,
        list_id: r.other_list_id,
        list_name: r.other_list_name,
      },
    }))

    return reply.send({ relationships })
  })

  // POST /relationships/:contactId — přidat propojení
  app.post('/:contactId', { preHandler: authenticate }, async (request, reply) => {
    const { contactId } = request.params as { contactId: string }

    const body = addSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Neplatná data' })
    }
    const { other_contact_id, label } = body.data

    if (contactId === other_contact_id) {
      return reply.status(400).send({ error: 'Kontakt nemůže být propojen sám se sebou' })
    }

    // Ověř vlastnictví obou kontaktů
    const owned = await sql`
      SELECT c.id FROM contacts c
      JOIN contact_lists cl ON cl.id = c.list_id
      WHERE c.id = ANY(ARRAY[${contactId}, ${other_contact_id}]::uuid[])
        AND cl.user_id = ${request.userId}
    `
    if (owned.length !== 2) {
      return reply.status(404).send({ error: 'Jeden nebo oba kontakty nebyly nalezeny' })
    }

    const [a, b] = normalizePair(contactId, other_contact_id)

    try {
      const [rel] = await sql`
        INSERT INTO contact_relationships (user_id, contact_a_id, contact_b_id, label)
        VALUES (${request.userId}, ${a}, ${b}, ${label ?? null})
        RETURNING *
      `
      return reply.status(201).send({ relationship: rel })
    } catch (err: any) {
      if (err.code === '23505') {
        return reply.status(409).send({ error: 'Tito kontakti jsou již propojeni' })
      }
      throw err
    }
  })

  // DELETE /relationships/:contactId/:otherId — odebrat propojení
  app.delete('/:contactId/:otherId', { preHandler: authenticate }, async (request, reply) => {
    const { contactId, otherId } = request.params as { contactId: string; otherId: string }
    const [a, b] = normalizePair(contactId, otherId)

    const [rel] = await sql`
      SELECT r.id FROM contact_relationships r
      WHERE r.contact_a_id = ${a} AND r.contact_b_id = ${b}
        AND r.user_id = ${request.userId}
    `
    if (!rel) return reply.status(404).send({ error: 'Propojení nenalezeno' })

    await sql`DELETE FROM contact_relationships WHERE id = ${rel.id}`
    return reply.send({ ok: true })
  })
}
