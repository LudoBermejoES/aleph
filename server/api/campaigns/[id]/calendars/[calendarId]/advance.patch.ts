import { eq } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { calendars } from '../../../../../db/schema/calendars'
import { advanceDate, type CalendarConfig, type CalendarDate } from '../../../../../services/calendar'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'dm')) throw createError({ statusCode: 403, message: 'Only DM can advance calendar date' })

  const calendarId = getRouterParam(event, 'calendarId')!
  const body = await readBody(event)
  const db = useDb()

  const cal = db.select().from(calendars).where(eq(calendars.id, calendarId)).get()
  if (!cal) throw createError({ statusCode: 404, message: 'Calendar not found' })

  const config: CalendarConfig = JSON.parse(cal.configJson)
  const currentDate: CalendarDate = cal.currentDateJson ? JSON.parse(cal.currentDateJson) : { year: 1, month: 1, day: 1 }

  const newDate = advanceDate(currentDate, body.days || 1, config)

  db.update(calendars).set({
    currentDateJson: JSON.stringify(newDate),
    updatedAt: new Date(),
  }).where(eq(calendars.id, calendarId)).run()

  return { currentDate: newDate }
})
