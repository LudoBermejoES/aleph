import { z } from 'zod'
import { randomUUID } from 'crypto'
import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { validateBody } from '../../../../../utils/validate'
import { gameSessions, sessionAttendance } from '../../../../../db/schema/sessions'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const attendanceSchema = z.object({
    rsvpStatus: z.enum(['pending', 'accepted', 'declined', 'tentative', 'yes', 'no', 'maybe']).optional(),
    attended: z.boolean().optional(),
    characterId: z.string().optional(),
  })
  const body = await validateBody(event, attendanceSchema)
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
