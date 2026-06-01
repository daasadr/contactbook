import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { sql } from '../db'
import { authenticate } from '../middleware/authenticate'
import { UPLOADS_DIR } from '../app'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { pipeline } from 'stream/promises'

const ALLOWED_PHOTO_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MIME_TO_EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }

const createContactSchema = z.object({
  first_name: z.string().min(1).max(255),
  last_name: z.string().max(255).optional(),
  custom_data: z.record(z.unknown()).optional().default({}),
  is_starred: z.boolean().optional().default(false),
  background: z.string().max(500).nullable().optional().refine(
    v => v === null || v === undefined || /^(#[0-9a-fA-F]{3,8}|linear-gradient\(.{1,500}\)|\/[a-zA-Z0-9_.-]{1,100})$/.test(v),
    'Neplatná hodnota pozadí'
  ),
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
      VALUES (${listId}, ${first_name}, ${last_name ?? null}, ${sql.json(custom_data as any)}, ${is_starred})
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

    const [existing] = await sql`SELECT * FROM contacts WHERE id = ${contactId} AND list_id = ${listId}`
    if (!existing) return reply.status(404).send({ error: 'Kontakt nenalezen' })

    const { first_name, last_name, is_starred, custom_data, background } = body.data

    const newFirstName = first_name !== undefined ? first_name : existing.first_name
    const newLastName = last_name !== undefined ? (last_name || null) : existing.last_name
    const newIsStarred = is_starred !== undefined ? is_starred : existing.is_starred
    const rawJson = custom_data !== undefined ? custom_data : existing.custom_data
    const newCustomData = (rawJson !== null && typeof rawJson === 'object' && !Array.isArray(rawJson)) ? rawJson : {}
    const newBackground = background !== undefined ? (background ?? null) : existing.background

    const [updated] = await sql`
      UPDATE contacts
      SET first_name = ${newFirstName},
          last_name = ${newLastName},
          is_starred = ${newIsStarred},
          custom_data = ${sql.json(newCustomData as any)},
          background = ${newBackground}
      WHERE id = ${contactId}
      RETURNING *
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

  // POST /lists/:listId/contacts/:contactId/photos — nahrát fotku
  app.post('/:listId/contacts/:contactId/photos', { preHandler: authenticate }, async (request, reply) => {
    const { listId, contactId } = request.params as { listId: string; contactId: string }
    if (!(await assertListOwnership(listId, request.userId))) return reply.status(404).send({ error: 'Seznam nenalezen' })

    const [contact] = await sql`SELECT id, photos FROM contacts WHERE id = ${contactId} AND list_id = ${listId}`
    if (!contact) return reply.status(404).send({ error: 'Kontakt nenalezen' })

    const data = await (request as any).file() as any
    if (!data) return reply.status(400).send({ error: 'Žádný soubor' })
    if (!ALLOWED_PHOTO_MIME.includes(data.mimetype)) {
      await data.file.resume()
      return reply.status(400).send({ error: 'Nepodporovaný formát.' })
    }

    const ext = MIME_TO_EXT[data.mimetype]
    const filename = `${crypto.randomUUID()}.${ext}`
    const filepath = path.join(UPLOADS_DIR, filename)
    try {
      await pipeline(data.file, fs.createWriteStream(filepath))
    } catch {
      try { await fs.promises.unlink(filepath) } catch { /* ignore */ }
      return reply.status(413).send({ error: 'Soubor je příliš velký.' })
    }

    const stat = await fs.promises.stat(filepath)
    const photo = { id: crypto.randomUUID(), filename, original_name: data.filename, mime_type: data.mimetype, size: stat.size }
    const [updated] = await sql`
      UPDATE contacts SET photos = photos || ${sql.json([photo])} WHERE id = ${contactId}
      RETURNING id, photos
    `
    return reply.status(201).send({ contact: updated })
  })

  // DELETE /lists/:listId/contacts/:contactId/photos/:photoId — smazat fotku
  app.delete('/:listId/contacts/:contactId/photos/:photoId', { preHandler: authenticate }, async (request, reply) => {
    const { listId, contactId, photoId } = request.params as { listId: string; contactId: string; photoId: string }
    if (!(await assertListOwnership(listId, request.userId))) return reply.status(404).send({ error: 'Seznam nenalezen' })

    const [contact] = await sql`SELECT id, photos FROM contacts WHERE id = ${contactId} AND list_id = ${listId}`
    if (!contact) return reply.status(404).send({ error: 'Kontakt nenalezen' })

    const photos = (contact.photos ?? []) as Array<{ id: string; filename: string }>
    const photo = photos.find(p => p.id === photoId)
    if (!photo) return reply.status(404).send({ error: 'Fotka nenalezena' })

    const remaining = photos.filter(p => p.id !== photoId)
    const [updated] = await sql`
      UPDATE contacts SET photos = ${sql.json(remaining)} WHERE id = ${contactId}
      RETURNING id, photos
    `
    try { await fs.promises.unlink(path.join(UPLOADS_DIR, photo.filename)) } catch { /* ignore */ }
    return reply.send({ contact: updated })
  })
}
