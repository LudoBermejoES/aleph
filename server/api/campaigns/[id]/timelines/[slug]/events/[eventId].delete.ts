import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../../utils/db'
import { timelines, timelineEvents } from '../../../../../../db/schema/calendars'
import { hasMinRole } from '../../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can delete timeline events' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const eventId = getRouterParam(event, 'eventId')!
  const db = useDb()

  const timeline = db.select().from(timelines)
    .where(and(eq(timelines.campaignId, campaignId), eq(timelines.slug, slug)))
    .get()
  if (!timeline) throw createError({ statusCode: 404, message: 'Timeline not found' })

  const timelineEvent = db.select().from(timelineEvents)
    .where(and(eq(timelineEvents.id, eventId), eq(timelineEvents.timelineId, timeline.id)))
    .get()
  if (!timelineEvent) throw createError({ statusCode: 404, message: 'Timeline event not found' })

  db.delete(timelineEvents).where(eq(timelineEvents.id, timelineEvent.id)).run()

  return { success: true }
})
