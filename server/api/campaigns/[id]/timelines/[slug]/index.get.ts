import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { timelines, timelineEvents } from '../../../../../db/schema/calendars'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()

  const tl = db.select().from(timelines)
    .where(and(eq(timelines.campaignId, campaignId), eq(timelines.slug, slug)))
    .get()

  if (!tl) throw createError({ statusCode: 404, message: 'Timeline not found' })

  const events = db.select().from(timelineEvents)
    .where(eq(timelineEvents.timelineId, tl.id))
    .orderBy(timelineEvents.sortOrder)
    .all()
    .map(e => ({ ...e, date: JSON.parse(e.dateJson) }))

  return { ...tl, events }
})
