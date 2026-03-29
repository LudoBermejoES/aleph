import { randomUUID } from 'crypto'
import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../../utils/db'
import { gameSessions, sessionContents } from '../../../../../../db/schema/sessions'
import { hasMinRole } from '../../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../../utils/permissions'

const VALID_TYPES = ['manual_notes', 'ai_notes', 'summary']

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can update session content' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const body = await readBody(event)
  const db = useDb()

  if (!body.type || !VALID_TYPES.includes(body.type)) {
    throw createError({ statusCode: 400, message: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` })
  }

  const session = db.select({ id: gameSessions.id }).from(gameSessions)
    .where(and(eq(gameSessions.campaignId, campaignId), eq(gameSessions.slug, slug)))
    .get()
  if (!session) throw createError({ statusCode: 404, message: 'Session not found' })

  const existing = db.select({ id: sessionContents.id }).from(sessionContents)
    .where(and(eq(sessionContents.sessionId, session.id), eq(sessionContents.type, body.type)))
    .get()

  const now = new Date()

  if (existing) {
    db.update(sessionContents)
      .set({ content: body.content ?? null, updatedAt: now })
      .where(eq(sessionContents.id, existing.id))
      .run()
  } else {
    db.insert(sessionContents).values({
      id: randomUUID(),
      sessionId: session.id,
      type: body.type,
      content: body.content ?? null,
      createdAt: now,
      updatedAt: now,
    }).run()
  }

  return { type: body.type, content: body.content ?? null }
})
