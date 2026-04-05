import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import {
  gameSessions,
  sessionAttendance,
  sessionGroups,
  sessionContents,
} from '../../../../../db/schema/sessions'
import { user } from '../../../../../db/schema/auth'
import { readEntityFile } from '../../../../../services/content'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()

  const session = db
    .select()
    .from(gameSessions)
    .where(and(eq(gameSessions.campaignId, campaignId), eq(gameSessions.slug, slug)))
    .get()
  if (!session) throw createError({ statusCode: 404, message: 'Session not found' })

  // Get group name if assigned
  let groupName: string | null = null
  if (session.groupId) {
    const group = db
      .select({ name: sessionGroups.name })
      .from(sessionGroups)
      .where(eq(sessionGroups.id, session.groupId))
      .get()
    groupName = group?.name ?? null
  }

  // Get attendance
  const attendance = db
    .select({
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

  // hasContent flags
  const contentRows = db
    .select({ type: sessionContents.type })
    .from(sessionContents)
    .where(eq(sessionContents.sessionId, session.id))
    .all()
  const hasContent = {
    manual_notes: contentRows.some((r) => r.type === 'manual_notes'),
    ai_notes: contentRows.some((r) => r.type === 'ai_notes'),
    summary: contentRows.some((r) => r.type === 'summary'),
  }

  // Read log file
  let log = { frontmatter: {}, content: '' }
  if (session.logFilePath) {
    try {
      log = await readEntityFile(session.logFilePath)
    } catch {}
  }

  return { ...session, groupName, attendance, hasContent, logContent: log.content }
})
