import { eq } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { calendars, calendarMoons, calendarSeasons } from '../../../../db/schema/calendars'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const db = useDb()

  const cals = db.select().from(calendars).where(eq(calendars.campaignId, campaignId)).all()

  return cals.map(cal => {
    const moons = db.select().from(calendarMoons).where(eq(calendarMoons.calendarId, cal.id)).all()
    const seasons = db.select().from(calendarSeasons).where(eq(calendarSeasons.calendarId, cal.id)).all()
    return {
      ...cal,
      config: JSON.parse(cal.configJson),
      currentDate: cal.currentDateJson ? JSON.parse(cal.currentDateJson) : null,
      moons,
      seasons,
    }
  })
})
