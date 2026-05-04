import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { sql } from '../db'
import { authenticate } from '../middleware/authenticate'
import { templates, templateMeta } from '../db/templates'
import type { TemplateType } from '../types'

const createListSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  template_type: z.enum(['networking', 'business', 'personal', 'general', 'custom']),
  icon: z.string().max(50).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
})

const updateListSchema = createListSchema.partial()

export async function listsRoutes(app: FastifyInstance) {
  // GET /lists — všechny seznamy přihlášeného uživatele
  app.get('/', { preHandler: authenticate }, async (request, reply) => {
    const lists = await sql`
      SELECT
        cl.*,
        COUNT(c.id)::int AS contact_count
      FROM contact_lists cl
      LEFT JOIN contacts c ON c.list_id = cl.id
      WHERE cl.user_id = ${request.userId}
      GROUP BY cl.id
      ORDER BY cl.created_at ASC
    `
    return reply.send({ lists })
  })

  // GET /lists/templates — dostupné šablony
  app.get('/templates', async (_request, reply) => {
    const result = Object.entries(templateMeta).map(([type, meta]) => ({ type, ...meta }))
    return reply.send({ templates: result })
  })

  // POST /lists — vytvoření nového seznamu
  app.post('/', { preHandler: authenticate }, async (request, reply) => {
    const body = createListSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Neplatná data', details: body.error.flatten().fieldErrors })
    }

    const { name, description, template_type, icon, color } = body.data
    const meta = templateMeta[template_type as TemplateType]

    const [list] = await sql`
      INSERT INTO contact_lists (user_id, name, description, template_type, icon, color)
      VALUES (
        ${request.userId},
        ${name},
        ${description ?? null},
        ${template_type},
        ${icon ?? meta.icon},
        ${color ?? meta.color}
      )
      RETURNING *
    `

    // Vložit šablonová pole
    const templateFields = templates[template_type as TemplateType]?.fields ?? []
    if (templateFields.length > 0) {
      await sql`
        INSERT INTO field_definitions ${sql(
          templateFields.map(f => ({
            list_id: list.id,
            name: f.name,
            label: f.label,
            field_type: f.field_type,
            options: f.options ? JSON.stringify(f.options) : null,
            placeholder: f.placeholder ?? null,
            is_required: f.is_required ?? false,
            is_built_in: true,
            sort_order: f.sort_order,
            section: f.section,
          })) as any
        )}
      `
    }

    return reply.status(201).send({ list: { ...list, contact_count: 0 } })
  })

  // GET /lists/:id
  app.get('/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const [list] = await sql`
      SELECT cl.*, COUNT(c.id)::int AS contact_count
      FROM contact_lists cl
      LEFT JOIN contacts c ON c.list_id = cl.id
      WHERE cl.id = ${id} AND cl.user_id = ${request.userId}
      GROUP BY cl.id
    `
    if (!list) return reply.status(404).send({ error: 'Seznam nenalezen' })
    return reply.send({ list })
  })

  // PATCH /lists/:id
  app.patch('/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = updateListSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Neplatná data', details: body.error.flatten().fieldErrors })
    }

    const [existing] = await sql`SELECT id FROM contact_lists WHERE id = ${id} AND user_id = ${request.userId}`
    if (!existing) return reply.status(404).send({ error: 'Seznam nenalezen' })

    const updates = body.data
    if (Object.keys(updates).length === 0) {
      return reply.status(400).send({ error: 'Žádná data k aktualizaci' })
    }

    const [updated] = await sql`
      UPDATE contact_lists SET ${sql(updates as any)} WHERE id = ${id} RETURNING *
    `
    return reply.send({ list: updated })
  })

  // DELETE /lists/:id
  app.delete('/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const [existing] = await sql`SELECT id FROM contact_lists WHERE id = ${id} AND user_id = ${request.userId}`
    if (!existing) return reply.status(404).send({ error: 'Seznam nenalezen' })

    await sql`DELETE FROM contact_lists WHERE id = ${id}`
    return reply.send({ ok: true })
  })
}
