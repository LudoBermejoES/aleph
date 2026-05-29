import { eq } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { timelines, timelineEvents } from '../../../../db/schema/calendars'

// Intentional raw array: timelines are small reference data always loaded in full.
// CLI and composable consumers depend on array shape — do not paginate.
export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const db = useDb()

  const tls = db
    .select()
    .from(timelines)
    .where(eq(timelines.campaignId, campaignId))
    .orderBy(timelines.sortOrder)
    .all()
  return tls.map((tl) => {
    const events = db
      .select()
      .from(timelineEvents)
      .where(eq(timelineEvents.timelineId, tl.id))
      .orderBy(timelineEvents.sortOrder)
      .all()
    return { ...tl, events: events.map((e) => ({ ...e, date: JSON.parse(e.dateJson) })) }
  })
})
