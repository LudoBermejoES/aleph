import { eq } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { calendars, calendarMoons, calendarSeasons, calendarEvents } from '../../../../../db/schema/calendars'

export default defineEventHandler(async (event) => {
  const calendarId = getRouterParam(event, 'calendarId')!
  const db = useDb()

  const cal = db.select().from(calendars).where(eq(calendars.id, calendarId)).get()
  if (!cal) throw createError({ statusCode: 404, message: 'Calendar not found' })

  const moons = db.select().from(calendarMoons).where(eq(calendarMoons.calendarId, cal.id)).all()
  const seasons = db.select().from(calendarSeasons).where(eq(calendarSeasons.calendarId, cal.id)).all()
  const events = db.select().from(calendarEvents).where(eq(calendarEvents.calendarId, cal.id)).all()

  return {
    ...cal,
    config: JSON.parse(cal.configJson),
    currentDate: cal.currentDateJson ? JSON.parse(cal.currentDateJson) : null,
    moons,
    seasons,
    events: events.map(e => ({ ...e, date: JSON.parse(e.dateJson), endDate: e.endDateJson ? JSON.parse(e.endDateJson) : null })),
  }
})
