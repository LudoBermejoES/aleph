import { z } from 'zod'
import { randomUUID } from 'crypto'
import { useDb } from '../../../../utils/db'
import { validateBody } from '../../../../utils/validate'
import { calendars, calendarMoons, calendarSeasons } from '../../../../db/schema/calendars'
import { hasMinRole } from '../../../../utils/permissions'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'dm')) throw createError({ statusCode: 403, message: 'Only DM can create calendars' })

  const campaignId = getRouterParam(event, 'id')!
  const calendarSchema = z.object({
    name: z.string().min(1),
    configJson: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
    months: z.array(z.unknown()).optional(),
    weekdays: z.array(z.unknown()).optional(),
    yearLength: z.number().optional(),
    currentDate: z.record(z.string(), z.unknown()).optional(),
    currentYear: z.number().optional(),
    currentMonth: z.number().optional(),
    currentDay: z.number().optional(),
    moons: z.array(z.object({ name: z.string(), cycleDays: z.number(), phaseOffset: z.number().optional(), color: z.string().optional() })).optional(),
    seasons: z.array(z.object({ name: z.string(), startMonth: z.number(), startDay: z.number(), endMonth: z.number(), endDay: z.number() })).optional(),
  })
  const body = await validateBody(event, calendarSchema)
  const db = useDb()
  const calId = randomUUID()
  const now = new Date()

  db.insert(calendars).values({
    id: calId,
    campaignId,
    name: body.name,
    configJson: body.configJson
      ? (typeof body.configJson === 'string' ? body.configJson : JSON.stringify(body.configJson))
      : JSON.stringify({ months: body.months || [], weekdays: body.weekdays || [], yearLength: body.yearLength || 360 }),
    currentDateJson: body.currentDate
      ? JSON.stringify(body.currentDate)
      : (body.currentYear
        ? JSON.stringify({ year: body.currentYear, month: body.currentMonth || 1, day: body.currentDay || 1 })
        : JSON.stringify({ year: 1, month: 1, day: 1 })),
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
