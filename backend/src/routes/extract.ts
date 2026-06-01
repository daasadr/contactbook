import type { FastifyInstance } from 'fastify'
import { sql } from '../db'
import { authenticate } from '../middleware/authenticate'
import { getAIClient, isAIAvailable, AI_MODEL } from '../lib/ai'
import { pipeline } from 'stream/promises'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { UPLOADS_DIR } from '../app'

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const EXTRACT_CREDITS = 2

const EXTRACT_PROMPT = `Analyzuj tento obrázek (vizitka, profil na síti, dokument, screenshot) a extrahuj kontaktní informace.

Vrať POUZE validní JSON objekt (bez markdown, bez backticks, bez komentářů) s těmito poli (vyplň jen ta, která jsou jasně viditelná):
{
  "first_name": "",
  "last_name": "",
  "email": "",
  "phone": "",
  "company": "",
  "job_title": "",
  "website": "",
  "linkedin": "",
  "twitter": "",
  "instagram": "",
  "address": "",
  "city": "",
  "country": "",
  "notes": ""
}

Pravidla:
- Telefonní čísla v mezinárodním formátu (+420...)
- E-maily malými písmeny
- URL s https:// prefixem
- Pro LinkedIn uveď celé URL (https://linkedin.com/in/...)
- Pokud pole není viditelné, vynech ho (neuváděj null ani prázdný řetězec)
- Odpověz POUZE JSON, nic jiného`

export async function extractRoutes(app: FastifyInstance) {
  // POST /extract/contact — extrahuje kontaktní data z obrázku
  app.post('/contact', { preHandler: authenticate }, async (request, reply) => {
    if (!isAIAvailable()) {
      return reply.status(503).send({ error: 'AI není momentálně k dispozici.' })
    }

    // Zkontroluj kredity
    const [userRow] = await sql`SELECT ai_credits, is_vip FROM users WHERE id = ${request.userId}`
    if (!userRow) return reply.status(404).send({ error: 'Uživatel nenalezen' })
    if (!userRow.is_vip && userRow.ai_credits < EXTRACT_CREDITS) {
      return reply.status(402).send({
        error: `Nedostatek kreditů. Extrakce stojí ${EXTRACT_CREDITS} kredity, máš ${userRow.ai_credits}.`
      })
    }

    // Přijmi obrázek
    const data = await (request as any).file() as any
    if (!data) return reply.status(400).send({ error: 'Žádný obrázek' })

    if (!ALLOWED_MIME.includes(data.mimetype)) {
      await data.file.resume()
      return reply.status(400).send({ error: 'Nepodporovaný formát. Povoleny jsou JPEG, PNG, WebP, GIF.' })
    }

    // Ulož dočasně na disk a přečti jako buffer
    const tmpName = `tmp_extract_${crypto.randomUUID()}`
    const tmpPath = path.join(UPLOADS_DIR, tmpName)

    try {
      await pipeline(data.file, fs.createWriteStream(tmpPath))

      if ((data.file as any).truncated) {
        return reply.status(413).send({ error: 'Obrázek je příliš velký (max 10 MB).' })
      }

      const imageBuffer = await fs.promises.readFile(tmpPath)
      const base64Image = imageBuffer.toString('base64')

      // Zavolej Claude vision
      const client = getAIClient()
      const response = await client.messages.create({
        model: AI_MODEL,
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: data.mimetype as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
                data: base64Image,
              },
            },
            { type: 'text', text: EXTRACT_PROMPT },
          ],
        }],
      })

      const rawText = response.content
        .filter(b => b.type === 'text')
        .map(b => (b as any).text)
        .join('')
        .trim()

      // Parsuj JSON
      let extracted: Record<string, string> = {}
      try {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          // Zachovej jen neprázdné string hodnoty
          for (const [k, v] of Object.entries(parsed)) {
            if (typeof v === 'string' && v.trim()) {
              extracted[k] = v.trim()
            }
          }
        }
      } catch {
        return reply.status(422).send({ error: 'Nepodařilo se rozpoznat data z obrázku. Zkus ostrší nebo lepší fotografii.' })
      }

      if (Object.keys(extracted).length === 0) {
        return reply.status(422).send({ error: 'Obrázek neobsahuje rozpoznatelné kontaktní informace.' })
      }

      // Odpočet kreditů
      if (!userRow.is_vip) {
        await sql`UPDATE users SET ai_credits = ai_credits - ${EXTRACT_CREDITS} WHERE id = ${request.userId}`
        await sql`INSERT INTO credit_transactions (user_id, type, credits, description)
                  VALUES (${request.userId}, 'usage', ${-EXTRACT_CREDITS}, 'Extrakce z obrázku')`
      }

      return reply.send({
        extracted,
        credits_remaining: userRow.is_vip ? null : userRow.ai_credits - EXTRACT_CREDITS,
      })
    } finally {
      // Smaž dočasný soubor
      await fs.promises.unlink(tmpPath).catch(() => {})
    }
  })
}
