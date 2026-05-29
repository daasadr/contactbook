import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { sql } from '../db'
import { authenticate } from '../middleware/authenticate'
import { UPLOADS_DIR } from '../app'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { pipeline } from 'stream/promises'

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

const eventBodySchema = z.object({
  title: z.string().max(255).optional(),
  content: z.string().min(1).max(10000),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
})

async function verifyContact(listId: string, contactId: string, userId: string) {
  const [row] = await sql`
    SELECT c.id FROM contacts c
    JOIN contact_lists cl ON cl.id = c.list_id
    WHERE c.id = ${contactId} AND cl.id = ${listId} AND cl.user_id = ${userId}
  `
  return row ?? null
}

async function verifyEvent(eventId: string, contactId: string, listId: string, userId: string) {
  const [row] = await sql`
    SELECT ce.id FROM contact_events ce
    JOIN contacts c ON c.id = ce.contact_id
    JOIN contact_lists cl ON cl.id = c.list_id
    WHERE ce.id = ${eventId} AND c.id = ${contactId} AND cl.id = ${listId} AND cl.user_id = ${userId}
  `
  return row ?? null
}

export async function eventsRoutes(app: FastifyInstance) {
  // GET /lists/:listId/contacts/:contactId/events
  app.get('/:listId/contacts/:contactId/events', { preHandler: authenticate }, async (request, reply) => {
    const { listId, contactId } = request.params as { listId: string; contactId: string }
    if (!await verifyContact(listId, contactId, request.userId)) {
      return reply.status(404).send({ error: 'Kontakt nenalezen' })
    }
    const events = await sql`
      SELECT id, title, content, event_date, tags, attachments, created_at, updated_at
      FROM contact_events
      WHERE contact_id = ${contactId}
      ORDER BY event_date DESC NULLS LAST, created_at DESC
    `
    return reply.send({ events })
  })

  // POST /lists/:listId/contacts/:contactId/events
  app.post('/:listId/contacts/:contactId/events', { preHandler: authenticate }, async (request, reply) => {
    const { listId, contactId } = request.params as { listId: string; contactId: string }
    const body = eventBodySchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Neplatná data', details: body.error.flatten().fieldErrors })
    if (!await verifyContact(listId, contactId, request.userId)) {
      return reply.status(404).send({ error: 'Kontakt nenalezen' })
    }
    const { title, content, event_date, tags } = body.data
    const [event] = await sql`
      INSERT INTO contact_events (contact_id, title, content, event_date, tags)
      VALUES (${contactId}, ${title ?? null}, ${content}, ${event_date ?? null}, ${tags ?? null})
      RETURNING id, title, content, event_date, tags, attachments, created_at, updated_at
    `
    return reply.status(201).send({ event })
  })

  // PUT /lists/:listId/contacts/:contactId/events/:eventId
  app.put('/:listId/contacts/:contactId/events/:eventId', { preHandler: authenticate }, async (request, reply) => {
    const { listId, contactId, eventId } = request.params as { listId: string; contactId: string; eventId: string }
    const body = eventBodySchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Neplatná data' })
    if (!await verifyEvent(eventId, contactId, listId, request.userId)) {
      return reply.status(404).send({ error: 'Záznam nenalezen' })
    }
    const { title, content, event_date, tags } = body.data
    const [updated] = await sql`
      UPDATE contact_events
      SET title = ${title ?? null}, content = ${content},
          event_date = ${event_date ?? null}, tags = ${tags ?? null},
          updated_at = NOW()
      WHERE id = ${eventId}
      RETURNING id, title, content, event_date, tags, attachments, created_at, updated_at
    `
    return reply.send({ event: updated })
  })

  // DELETE /lists/:listId/contacts/:contactId/events/:eventId
  app.delete('/:listId/contacts/:contactId/events/:eventId', { preHandler: authenticate }, async (request, reply) => {
    const { listId, contactId, eventId } = request.params as { listId: string; contactId: string; eventId: string }
    if (!await verifyEvent(eventId, contactId, listId, request.userId)) {
      return reply.status(404).send({ error: 'Záznam nenalezen' })
    }
    // Delete all attachment files for this event
    const [ev] = await sql`SELECT attachments FROM contact_events WHERE id = ${eventId}`
    const attachments = (ev?.attachments ?? []) as Array<{ filename: string }>
    for (const att of attachments) {
      try { await fs.promises.unlink(path.join(UPLOADS_DIR, att.filename)) } catch { /* ignore */ }
    }
    await sql`DELETE FROM contact_events WHERE id = ${eventId}`
    return reply.send({ ok: true })
  })

  // POST /lists/:listId/contacts/:contactId/events/:eventId/attachments — upload photo
  app.post('/:listId/contacts/:contactId/events/:eventId/attachments', { preHandler: authenticate }, async (request, reply) => {
    const { listId, contactId, eventId } = request.params as { listId: string; contactId: string; eventId: string }
    if (!await verifyEvent(eventId, contactId, listId, request.userId)) {
      return reply.status(404).send({ error: 'Záznam nenalezen' })
    }

    const data = await (request as any).file() as import('@fastify/multipart').MultipartFile | undefined
    if (!data) return reply.status(400).send({ error: 'Žádný soubor' })

    if (!ALLOWED_MIME.includes(data.mimetype)) {
      await data.file.resume()
      return reply.status(400).send({ error: 'Nepodporovaný formát. Povoleny jsou JPEG, PNG, WebP, GIF.' })
    }

    const ext = MIME_TO_EXT[data.mimetype]
    const filename = `${crypto.randomUUID()}.${ext}`
    const filepath = path.join(UPLOADS_DIR, filename)

    try {
      await pipeline(data.file, fs.createWriteStream(filepath))
    } catch {
      try { await fs.promises.unlink(filepath) } catch { /* ignore */ }
      return reply.status(413).send({ error: 'Soubor je příliš velký (max 10 MB).' })
    }

    if ((data.file as any).truncated) {
      try { await fs.promises.unlink(filepath) } catch { /* ignore */ }
      return reply.status(413).send({ error: 'Soubor je příliš velký (max 10 MB).' })
    }

    const stat = await fs.promises.stat(filepath)
    const attachment = {
      id: crypto.randomUUID(),
      filename,
      original_name: data.filename,
      mime_type: data.mimetype,
      size: stat.size,
    }

    const [updated] = await sql`
      UPDATE contact_events
      SET attachments = attachments || ${sql.json([attachment])},
          updated_at = NOW()
      WHERE id = ${eventId}
      RETURNING id, title, content, event_date, tags, attachments, created_at, updated_at
    `
    return reply.status(201).send({ event: updated })
  })

  // DELETE /lists/:listId/contacts/:contactId/events/:eventId/attachments/:attachmentId
  app.delete('/:listId/contacts/:contactId/events/:eventId/attachments/:attachmentId', { preHandler: authenticate }, async (request, reply) => {
    const { listId, contactId, eventId, attachmentId } = request.params as {
      listId: string; contactId: string; eventId: string; attachmentId: string
    }
    if (!await verifyEvent(eventId, contactId, listId, request.userId)) {
      return reply.status(404).send({ error: 'Záznam nenalezen' })
    }

    const [ev] = await sql`SELECT attachments FROM contact_events WHERE id = ${eventId}`
    const attachments = (ev?.attachments ?? []) as Array<{ id: string; filename: string }>
    const att = attachments.find(a => a.id === attachmentId)
    if (!att) return reply.status(404).send({ error: 'Příloha nenalezena' })

    // Remove from DB first, then delete file
    const remaining = attachments.filter(a => a.id !== attachmentId)
    const [updated] = await sql`
      UPDATE contact_events
      SET attachments = ${sql.json(remaining)}, updated_at = NOW()
      WHERE id = ${eventId}
      RETURNING id, title, content, event_date, tags, attachments, created_at, updated_at
    `
    try { await fs.promises.unlink(path.join(UPLOADS_DIR, att.filename)) } catch { /* ignore */ }

    return reply.send({ event: updated })
  })
}
