import { randomUUID } from 'crypto'
import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { gameSessions, sessionAttendance } from '../../../../../db/schema/sessions'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const body = await readBody(event)
  const userId = event.context.user.id
  const db = useDb()

  const session = db.select().from(gameSessions)
    .where(and(eq(gameSessions.campaignId, campaignId), eq(gameSessions.slug, slug)))
    .get()
  if (!session) throw createError({ statusCode: 404, message: 'Session not found' })

  // Find or create attendance record
  let record = db.select().from(sessionAttendance)
    .where(and(eq(sessionAttendance.sessionId, session.id), eq(sessionAttendance.userId, userId)))
    .get()

  if (record) {
    const updates: Record<string, unknown> = {}
    if (body.rsvpStatus !== undefined) updates.rsvpStatus = body.rsvpStatus
    if (body.attended !== undefined) updates.attended = body.attended
    if (body.characterId !== undefined) updates.characterId = body.characterId
    db.update(sessionAttendance).set(updates).where(eq(sessionAttendance.id, record.id)).run()
  } else {
    db.insert(sessionAttendance).values({
      id: randomUUID(),
      sessionId: session.id,
      userId,
      characterId: body.characterId || null,
      rsvpStatus: body.rsvpStatus || 'pending',
      attended: body.attended || false,
    }).run()
  }

  return { success: true }
})
