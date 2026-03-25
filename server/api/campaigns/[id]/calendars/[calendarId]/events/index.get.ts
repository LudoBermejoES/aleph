import { eq } from 'drizzle-orm'
import { useDb } from '../../../../../../utils/db'
import { calendarEvents } from '../../../../../../db/schema/calendars'
import { entities } from '../../../../../../db/schema/entities'

export default defineEventHandler(async (event) => {
  const calendarId = getRouterParam(event, 'calendarId')!
  const query = getQuery(event)
  const db = useDb()

  let results = db.select().from(calendarEvents)
    .where(eq(calendarEvents.calendarId, calendarId))
    .all()
    .map(e => {
      let linkedEntityName: string | null = null
      if (e.linkedEntityId) {
        const ent = db.select({ name: entities.name }).from(entities).where(eq(entities.id, e.linkedEntityId)).get()
        linkedEntityName = ent?.name || null
      }
      return { ...e, date: JSON.parse(e.dateJson), endDate: e.endDateJson ? JSON.parse(e.endDateJson) : null, linkedEntityName }
    })

  // Filter by date range
  if (query.from_year || query.to_year) {
    const fromYear = parseInt(query.from_year as string || '0')
    const toYear = parseInt(query.to_year as string || '99999')
    results = results.filter(e => {
      const year = e.date?.year ?? 0
      return year >= fromYear && year <= toYear
    })
  }

  if (query.month) {
    const month = parseInt(query.month as string)
    results = results.filter(e => e.date?.month === month)
  }

  return results
})
