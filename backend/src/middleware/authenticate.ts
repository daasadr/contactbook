import type { FastifyRequest, FastifyReply } from 'fastify'

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
    const payload = request.user as { id: string }
    request.userId = payload.id
  } catch {
    reply.status(401).send({ error: 'Přístup odepřen — přihlaste se prosím' })
  }
}
