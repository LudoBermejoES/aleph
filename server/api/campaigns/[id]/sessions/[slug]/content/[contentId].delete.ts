import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../../utils/db'
import { gameSessions, sessionContents } from '../../../../../../db/schema/sessions'
import { hasMinRole } from '../../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'co_dm'))
    throw createError({ statusCode: 403, message: 'Co-DM or above can delete session content' })

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const contentId = getRouterParam(event, 'contentId')!
  const db = useDb()

  const session = db
    .select()
    .from(gameSessions)
    .where(and(eq(gameSessions.campaignId, campaignId), eq(gameSessions.slug, slug)))
    .get()
  if (!session) throw createError({ statusCode: 404, message: 'Session not found' })

  const content = db
    .select()
    .from(sessionContents)
    .where(and(eq(sessionContents.id, contentId), eq(sessionContents.sessionId, session.id)))
    .get()
  if (!content) throw createError({ statusCode: 404, message: 'Session content not found' })

  db.delete(sessionContents).where(eq(sessionContents.id, contentId)).run()

  return { success: true }
})
