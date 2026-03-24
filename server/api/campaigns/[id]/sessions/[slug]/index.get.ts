import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { gameSessions, sessionAttendance } from '../../../../../db/schema/sessions'
import { user } from '../../../../../db/schema/auth'
import { readEntityFile } from '../../../../../services/content'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()

  const session = db.select().from(gameSessions)
    .where(and(eq(gameSessions.campaignId, campaignId), eq(gameSessions.slug, slug)))
    .get()
  if (!session) throw createError({ statusCode: 404, message: 'Session not found' })

  // Get attendance
  const attendance = db.select({
    id: sessionAttendance.id,
    userId: sessionAttendance.userId,
    userName: user.name,
    characterId: sessionAttendance.characterId,
    rsvpStatus: sessionAttendance.rsvpStatus,
    attended: sessionAttendance.attended,
  })
    .from(sessionAttendance)
    .innerJoin(user, eq(sessionAttendance.userId, user.id))
    .where(eq(sessionAttendance.sessionId, session.id))
    .all()

  // Read log file
  let log = { frontmatter: {}, content: '' }
  if (session.logFilePath) {
    try { log = await readEntityFile(session.logFilePath) } catch {}
  }

  return { ...session, attendance, logContent: log.content }
})
