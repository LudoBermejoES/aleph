import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { timelines } from '../../../../../db/schema/calendars'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'co_dm')) {
    throw createError({ statusCode: 403, message: 'Co-DM or above can delete timelines' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()

  const timeline = db.select().from(timelines)
    .where(and(eq(timelines.campaignId, campaignId), eq(timelines.slug, slug)))
    .get()
  if (!timeline) throw createError({ statusCode: 404, message: 'Timeline not found' })

  db.delete(timelines).where(eq(timelines.id, timeline.id)).run()

  return { success: true }
})
