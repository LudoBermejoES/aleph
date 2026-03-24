import { randomUUID } from 'crypto'
import { useDb } from '../../../../utils/db'
import { calendars, calendarMoons, calendarSeasons } from '../../../../db/schema/calendars'
import { hasMinRole } from '../../../../utils/permissions'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'dm')) throw createError({ statusCode: 403, message: 'Only DM can create calendars' })

  const campaignId = getRouterParam(event, 'id')!
  const body = await readBody(event)
  const db = useDb()
  const calId = randomUUID()
  const now = new Date()

  db.insert(calendars).values({
    id: calId,
    campaignId,
    name: body.name,
    configJson: JSON.stringify({ months: body.months || [], weekdays: body.weekdays || [], yearLength: body.yearLength || 360 }),
    currentDateJson: body.currentDate ? JSON.stringify(body.currentDate) : JSON.stringify({ year: 1, month: 1, day: 1 }),
    createdAt: now,
    updatedAt: now,
  }).run()

  // Add moons
  for (const moon of (body.moons || [])) {
    db.insert(calendarMoons).values({
      id: randomUUID(), calendarId: calId,
      name: moon.name, cycleDays: moon.cycleDays, phaseOffset: moon.phaseOffset || 0, color: moon.color || null,
    }).run()
  }

  // Add seasons
  for (const season of (body.seasons || [])) {
    db.insert(calendarSeasons).values({
      id: randomUUID(), calendarId: calId,
      name: season.name, startMonth: season.startMonth, startDay: season.startDay,
      endMonth: season.endMonth, endDay: season.endDay,
    }).run()
  }

  return { id: calId, name: body.name }
})
