import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../../utils/db'
import { withApiHandler } from '../../../../../../utils/api-handler'
import { gameSessions, sessionAttendance } from '../../../../../../db/schema/sessions'
import { hasMinRole } from '../../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../../utils/permissions'

export default defineEventHandler((event) =>
  withApiHandler(event, async () => {
    const role = event.context.campaignRole as CampaignRole
    if (!hasMinRole(role, 'co_dm')) {
      throw createError({ statusCode: 403, message: 'Only DM or co-DM can remove participants' })
    }

    const campaignId = getRouterParam(event, 'id')!
    const slug = getRouterParam(event, 'slug')!
    const userId = getRouterParam(event, 'userId')!
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

    db.delete(sessionAttendance).where(eq(sessionAttendance.id, record.id)).run()

    return { success: true }
  }),
)
