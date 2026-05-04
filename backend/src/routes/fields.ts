import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { sql } from '../db'
import { authenticate } from '../middleware/authenticate'

const fieldSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/, 'Pouze malá písmena, číslice a podtržítko'),
  label: z.string().min(1).max(255),
  field_type: z.enum(['text', 'textarea', 'email', 'phone', 'url', 'date', 'number', 'select', 'multiselect', 'checkbox']),
  options: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
  placeholder: z.string().max(255).optional(),
  is_required: z.boolean().optional().default(false),
  sort_order: z.number().int().optional().default(50),
  section: z.string().max(100).optional().default('general'),
})

const reorderSchema = z.array(z.object({
  id: z.string().uuid(),
  sort_order: z.number().int(),
}))

async function assertListOwnership(listId: string, userId: string) {
  const [list] = await sql`SELECT id FROM contact_lists WHERE id = ${listId} AND user_id = ${userId}`
  return !!list
}

export async function fieldsRoutes(app: FastifyInstance) {
  // GET /lists/:listId/fields
  app.get('/:listId/fields', { preHandler: authenticate }, async (request, reply) => {
    const { listId } = request.params as { listId: string }
    if (!(await assertListOwnership(listId, request.userId))) {
      return reply.status(404).send({ error: 'Seznam nenalezen' })
    }

    const fields = await sql`
      SELECT * FROM field_definitions WHERE list_id = ${listId} ORDER BY sort_order ASC, created_at ASC
    `
    return reply.send({ fields })
  })

  // POST /lists/:listId/fields
  app.post('/:listId/fields', { preHandler: authenticate }, async (request, reply) => {
    const { listId } = request.params as { listId: string }
    if (!(await assertListOwnership(listId, request.userId))) {
      return reply.status(404).send({ error: 'Seznam nenalezen' })
    }

    const body = fieldSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Neplatná data', details: body.error.flatten().fieldErrors })
    }

    const { name, label, field_type, options, placeholder, is_required, sort_order, section } = body.data

    const existing = await sql`SELECT id FROM field_definitions WHERE list_id = ${listId} AND name = ${name}`
    if (existing.length > 0) {
      return reply.status(409).send({ error: `Pole s názvem "${name}" v tomto seznamu již existuje` })
    }

    const [field] = await sql`
      INSERT INTO field_definitions (list_id, name, label, field_type, options, placeholder, is_required, is_built_in, sort_order, section)
      VALUES (${listId}, ${name}, ${label}, ${field_type}, ${options ? JSON.stringify(options) : null}, ${placeholder ?? null}, ${is_required}, FALSE, ${sort_order}, ${section})
      RETURNING *
    `
    return reply.status(201).send({ field })
  })

  // PATCH /lists/:listId/fields/:fieldId
  app.patch('/:listId/fields/:fieldId', { preHandler: authenticate }, async (request, reply) => {
    const { listId, fieldId } = request.params as { listId: string; fieldId: string }
    if (!(await assertListOwnership(listId, request.userId))) {
      return reply.status(404).send({ error: 'Seznam nenalezen' })
    }

    const body = fieldSchema.partial().safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Neplatná data', details: body.error.flatten().fieldErrors })
    }

    const [existing] = await sql`SELECT id FROM field_definitions WHERE id = ${fieldId} AND list_id = ${listId}`
    if (!existing) return reply.status(404).send({ error: 'Pole nenalezeno' })

    const updates: Record<string, unknown> = { ...body.data }
    if (updates.options !== undefined) {
      updates.options = JSON.stringify(updates.options)
    }

    const [updated] = await sql`UPDATE field_definitions SET ${sql(updates as any)} WHERE id = ${fieldId} RETURNING *`
    return reply.send({ field: updated })
  })

  // DELETE /lists/:listId/fields/:fieldId
  app.delete('/:listId/fields/:fieldId', { preHandler: authenticate }, async (request, reply) => {
    const { listId, fieldId } = request.params as { listId: string; fieldId: string }
    if (!(await assertListOwnership(listId, request.userId))) {
      return reply.status(404).send({ error: 'Seznam nenalezen' })
    }

    const [existing] = await sql`SELECT id FROM field_definitions WHERE id = ${fieldId} AND list_id = ${listId}`
    if (!existing) return reply.status(404).send({ error: 'Pole nenalezeno' })

    await sql`DELETE FROM field_definitions WHERE id = ${fieldId}`
    return reply.send({ ok: true })
  })

  // PUT /lists/:listId/fields/reorder — změna pořadí polí
  app.put('/:listId/fields/reorder', { preHandler: authenticate }, async (request, reply) => {
    const { listId } = request.params as { listId: string }
    if (!(await assertListOwnership(listId, request.userId))) {
      return reply.status(404).send({ error: 'Seznam nenalezen' })
    }

    const body = reorderSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Neplatná data' })
    }

    for (const { id, sort_order } of body.data) {
      await sql`UPDATE field_definitions SET sort_order = ${sort_order} WHERE id = ${id} AND list_id = ${listId}`
    }
    return reply.send({ ok: true })
  })
}
