import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../../utils/db'
import { validateBody } from '../../../../../../utils/validate'
import { withApiHandler } from '../../../../../../utils/api-handler'
import { attendanceXpSchema, canSetAttendanceXp } from '../../../../../../utils/attendance-xp'
import { gameSessions, sessionAttendance } from '../../../../../../db/schema/sessions'
import { hasMinRole } from '../../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../../utils/permissions'

export default defineEventHandler((event) =>
  withApiHandler(event, async () => {
    const role = event.context.campaignRole as CampaignRole
    if (!hasMinRole(role, 'co_dm')) {
      throw createError({ statusCode: 403, message: 'Only DM or co-DM can record XP' })
    }

    const campaignId = getRouterParam(event, 'id')!
    const slug = getRouterParam(event, 'slug')!
    const userId = getRouterParam(event, 'userId')!
    const body = await validateBody(event, attendanceXpSchema)
    const db = useDb()

    const session = db
      .select()
      .from(gameSessions)
      .where(and(eq(gameSessions.campaignId, campaignId), eq(gameSessions.slug, slug)))
      .get()
    if (!session) throw createError({ statusCode: 404, message: 'Session not found' })

    const record = db
      .select()
      .from(sessionAttendance)
      .where(and(eq(sessionAttendance.sessionId, session.id), eq(sessionAttendance.userId, userId)))
      .get()
    if (!record) {
      throw createError({ statusCode: 404, message: 'Participant not on this session' })
    }

    if (!canSetAttendanceXp(record.attended, body.xp)) {
      throw createError({
        statusCode: 422,
        message: 'Cannot record XP for a session the player did not attend',
      })
    }

    db.update(sessionAttendance)
      .set({ xp: body.xp })
      .where(eq(sessionAttendance.id, record.id))
      .run()

    return { success: true, xp: body.xp }
  }),
)
