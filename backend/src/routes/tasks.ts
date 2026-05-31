import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { sql } from '../db'
import { authenticate } from '../middleware/authenticate'

const taskBodySchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  due_date: z.string().datetime().nullable().optional(),
  contact_id: z.string().uuid(),
})

async function verifyTask(taskId: string, userId: string) {
  const [row] = await sql`
    SELECT t.id FROM tasks t
    JOIN contacts c ON c.id = t.contact_id
    JOIN contact_lists cl ON cl.id = c.list_id
    WHERE t.id = ${taskId} AND cl.user_id = ${userId}
  `
  return row ?? null
}

export async function tasksRoutes(app: FastifyInstance) {
  // GET /tasks — všechny úkoly uživatele s info o kontaktu
  app.get('/', { preHandler: authenticate }, async (request, reply) => {
    const { completed } = (request.query as any)
    const showCompleted = completed === 'true'

    const tasks = await sql`
      SELECT
        t.id, t.title, t.description, t.due_date, t.is_completed, t.completed_at, t.created_at,
        c.id   AS contact_id,
        c.first_name, c.last_name,
        cl.id  AS list_id,
        cl.name AS list_name, cl.color AS list_color
      FROM tasks t
      JOIN contacts c  ON c.id  = t.contact_id
      JOIN contact_lists cl ON cl.id = c.list_id
      WHERE cl.user_id = ${request.userId}
        AND t.is_completed = ${showCompleted}
      ORDER BY t.due_date ASC NULLS LAST, t.created_at ASC
    `
    return reply.send({ tasks })
  })

  // POST /tasks — vytvoř úkol
  app.post('/', { preHandler: authenticate }, async (request, reply) => {
    const body = taskBodySchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Neplatná data', details: body.error.flatten().fieldErrors })

    // Ověř vlastnictví kontaktu
    const [contact] = await sql`
      SELECT c.id FROM contacts c
      JOIN contact_lists cl ON cl.id = c.list_id
      WHERE c.id = ${body.data.contact_id} AND cl.user_id = ${request.userId}
    `
    if (!contact) return reply.status(404).send({ error: 'Kontakt nenalezen' })

    const { title, description, due_date, contact_id } = body.data
    const [task] = await sql`
      INSERT INTO tasks (user_id, contact_id, title, description, due_date)
      VALUES (${request.userId}, ${contact_id}, ${title}, ${description ?? null}, ${due_date ?? null})
      RETURNING id, title, description, due_date, is_completed, completed_at, created_at, contact_id
    `
    return reply.status(201).send({ task })
  })

  // PATCH /tasks/:id — uprav úkol
  app.patch('/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string }
    if (!await verifyTask(id, request.userId)) return reply.status(404).send({ error: 'Úkol nenalezen' })

    const body = taskBodySchema.partial().omit({ contact_id: true }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Neplatná data' })

    const updates: Record<string, unknown> = {}
    if (body.data.title !== undefined) updates.title = body.data.title
    if (body.data.description !== undefined) updates.description = body.data.description
    if (body.data.due_date !== undefined) updates.due_date = body.data.due_date

    if (Object.keys(updates).length === 0) return reply.status(400).send({ error: 'Žádné změny' })

    const [updated] = await sql`
      UPDATE tasks SET ${sql(updates as any)} WHERE id = ${id}
      RETURNING id, title, description, due_date, is_completed, completed_at, created_at, contact_id
    `
    return reply.send({ task: updated })
  })

  // PATCH /tasks/:id/complete — přepni splnění
  app.patch('/:id/complete', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string }
    if (!await verifyTask(id, request.userId)) return reply.status(404).send({ error: 'Úkol nenalezen' })

    const [task] = await sql`SELECT is_completed FROM tasks WHERE id = ${id}`
    const nowCompleted = !task.is_completed

    const [updated] = await sql`
      UPDATE tasks
      SET is_completed = ${nowCompleted}, completed_at = ${nowCompleted ? sql`NOW()` : null}
      WHERE id = ${id}
      RETURNING id, title, is_completed, completed_at, due_date, contact_id
    `
    return reply.send({ task: updated })
  })

  // DELETE /tasks/:id
  app.delete('/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string }
    if (!await verifyTask(id, request.userId)) return reply.status(404).send({ error: 'Úkol nenalezen' })
    await sql`DELETE FROM tasks WHERE id = ${id}`
    return reply.send({ ok: true })
  })
}
