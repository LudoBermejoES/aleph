import { eq, inArray } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { calendars, calendarMoons, calendarSeasons } from '../../../../db/schema/calendars'

// Intentional raw array: calendars are small reference data always loaded in full.
// CLI and composable consumers depend on array shape — do not paginate.
export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const db = useDb()

  const cals = db.select().from(calendars).where(eq(calendars.campaignId, campaignId)).all()
  if (cals.length === 0) return []

  const calIds = cals.map((c) => c.id)
  const allMoons = db
    .select()
    .from(calendarMoons)
    .where(inArray(calendarMoons.calendarId, calIds))
    .all()
  const allSeasons = db
    .select()
    .from(calendarSeasons)
    .where(inArray(calendarSeasons.calendarId, calIds))
    .all()

  const moonsByCalId = new Map<string, typeof allMoons>()
  const seasonsByCalId = new Map<string, typeof allSeasons>()
  for (const m of allMoons) {
    if (!moonsByCalId.has(m.calendarId)) moonsByCalId.set(m.calendarId, [])
    moonsByCalId.get(m.calendarId)!.push(m)
  }
  for (const s of allSeasons) {
    if (!seasonsByCalId.has(s.calendarId)) seasonsByCalId.set(s.calendarId, [])
    seasonsByCalId.get(s.calendarId)!.push(s)
  }

  return cals.map((cal) => ({
    ...cal,
    config: JSON.parse(cal.configJson),
    currentDate: cal.currentDateJson ? JSON.parse(cal.currentDateJson) : null,
    moons: moonsByCalId.get(cal.id) ?? [],
    seasons: seasonsByCalId.get(cal.id) ?? [],
  }))
})
