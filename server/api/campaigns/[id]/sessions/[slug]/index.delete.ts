import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { gameSessions } from '../../../../../db/schema/sessions'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'co_dm')) {
    throw createError({ statusCode: 403, message: 'Co-DM or above can delete sessions' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()

  const session = db
    .select({ id: gameSessions.id })
    .from(gameSessions)
    .where(and(eq(gameSessions.campaignId, campaignId), eq(gameSessions.slug, slug)))
    .get()
  if (!session) throw createError({ statusCode: 404, message: 'Session not found' })

  // foreign_keys = ON — cascade deletes session_contents, session_attendance, decisions
  db.delete(gameSessions).where(eq(gameSessions.id, session.id)).run()

  return { success: true }
})
