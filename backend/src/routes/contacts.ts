import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { sql } from '../db'
import { authenticate } from '../middleware/authenticate'

const createContactSchema = z.object({
  first_name: z.string().min(1).max(255),
  last_name: z.string().max(255).optional(),
  custom_data: z.record(z.unknown()).optional().default({}),
  is_starred: z.boolean().optional().default(false),
})

const updateContactSchema = createContactSchema.partial()

async function assertListOwnership(listId: string, userId: string) {
  const [list] = await sql`SELECT id FROM contact_lists WHERE id = ${listId} AND user_id = ${userId}`
  return !!list
}

export async function contactsRoutes(app: FastifyInstance) {
  // GET /lists/:listId/contacts
  app.get('/:listId/contacts', { preHandler: authenticate }, async (request, reply) => {
    const { listId } = request.params as { listId: string }
    const query = (request.query as Record<string, string>)
    const search = query.search ?? ''
    const starred = query.starred === 'true'

    if (!(await assertListOwnership(listId, request.userId))) {
      return reply.status(404).send({ error: 'Seznam nenalezen' })
    }

    let contacts
    if (search) {
      contacts = await sql`
        SELECT * FROM contacts
        WHERE list_id = ${listId}
          AND (
            first_name ILIKE ${'%' + search + '%'}
            OR last_name ILIKE ${'%' + search + '%'}
            OR custom_data::text ILIKE ${'%' + search + '%'}
          )
          ${starred ? sql`AND is_starred = TRUE` : sql``}
        ORDER BY is_starred DESC, first_name ASC, last_name ASC
      `
    } else {
      contacts = await sql`
        SELECT * FROM contacts
        WHERE list_id = ${listId}
          ${starred ? sql`AND is_starred = TRUE` : sql``}
        ORDER BY is_starred DESC, first_name ASC, last_name ASC
      `
    }

    return reply.send({ contacts })
  })

  // POST /lists/:listId/contacts
  app.post('/:listId/contacts', { preHandler: authenticate }, async (request, reply) => {
    const { listId } = request.params as { listId: string }
    if (!(await assertListOwnership(listId, request.userId))) {
      return reply.status(404).send({ error: 'Seznam nenalezen' })
    }

    const body = createContactSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Neplatná data', details: body.error.flatten().fieldErrors })
    }

    const { first_name, last_name, custom_data, is_starred } = body.data
    const [contact] = await sql`
      INSERT INTO contacts (list_id, first_name, last_name, custom_data, is_starred)
      VALUES (${listId}, ${first_name}, ${last_name ?? null}, ${JSON.stringify(custom_data)}, ${is_starred})
      RETURNING *
    `
    return reply.status(201).send({ contact })
  })

  // GET /lists/:listId/contacts/:contactId
  app.get('/:listId/contacts/:contactId', { preHandler: authenticate }, async (request, reply) => {
    const { listId, contactId } = request.params as { listId: string; contactId: string }
    if (!(await assertListOwnership(listId, request.userId))) {
      return reply.status(404).send({ error: 'Seznam nenalezen' })
    }

    const [contact] = await sql`SELECT * FROM contacts WHERE id = ${contactId} AND list_id = ${listId}`
    if (!contact) return reply.status(404).send({ error: 'Kontakt nenalezen' })
    return reply.send({ contact })
  })

  // PATCH /lists/:listId/contacts/:contactId
  app.patch('/:listId/contacts/:contactId', { preHandler: authenticate }, async (request, reply) => {
    const { listId, contactId } = request.params as { listId: string; contactId: string }
    if (!(await assertListOwnership(listId, request.userId))) {
      return reply.status(404).send({ error: 'Seznam nenalezen' })
    }

    const body = updateContactSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Neplatná data', details: body.error.flatten().fieldErrors })
    }

    const [existing] = await sql`SELECT id FROM contacts WHERE id = ${contactId} AND list_id = ${listId}`
    if (!existing) return reply.status(404).send({ error: 'Kontakt nenalezen' })

    const updates = { ...body.data }
    if (updates.custom_data !== undefined) {
      (updates as any).custom_data = JSON.stringify(updates.custom_data)
    }

    const [updated] = await sql`
      UPDATE contacts SET ${sql(updates as any)} WHERE id = ${contactId} RETURNING *
    `
    return reply.send({ contact: updated })
  })

  // DELETE /lists/:listId/contacts/:contactId
  app.delete('/:listId/contacts/:contactId', { preHandler: authenticate }, async (request, reply) => {
    const { listId, contactId } = request.params as { listId: string; contactId: string }
    if (!(await assertListOwnership(listId, request.userId))) {
      return reply.status(404).send({ error: 'Seznam nenalezen' })
    }

    const [existing] = await sql`SELECT id FROM contacts WHERE id = ${contactId} AND list_id = ${listId}`
    if (!existing) return reply.status(404).send({ error: 'Kontakt nenalezen' })

    await sql`DELETE FROM contacts WHERE id = ${contactId}`
    return reply.send({ ok: true })
  })

  // PATCH /lists/:listId/contacts/:contactId/star — hvězdičkování
  app.patch('/:listId/contacts/:contactId/star', { preHandler: authenticate }, async (request, reply) => {
    const { listId, contactId } = request.params as { listId: string; contactId: string }
    if (!(await assertListOwnership(listId, request.userId))) {
      return reply.status(404).send({ error: 'Seznam nenalezen' })
    }

    const [contact] = await sql`
      UPDATE contacts SET is_starred = NOT is_starred WHERE id = ${contactId} AND list_id = ${listId} RETURNING *
    `
    if (!contact) return reply.status(404).send({ error: 'Kontakt nenalezen' })
    return reply.send({ contact })
  })
}
