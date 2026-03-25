import { eq } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { calendars } from '../../../../../db/schema/calendars'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'dm')) throw createError({ statusCode: 403, message: 'Only DM can update calendars' })

  const calendarId = getRouterParam(event, 'calendarId')!
  const body = await readBody(event)
  const db = useDb()

  const cal = db.select().from(calendars).where(eq(calendars.id, calendarId)).get()
  if (!cal) throw createError({ statusCode: 404, message: 'Calendar not found' })

  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (body.name !== undefined) updates.name = body.name
  if (body.months || body.weekdays || body.yearLength) {
    const config = JSON.parse(cal.configJson)
    if (body.months) config.months = body.months
    if (body.weekdays) config.weekdays = body.weekdays
    if (body.yearLength) config.yearLength = body.yearLength
    updates.configJson = JSON.stringify(config)
  }

  db.update(calendars).set(updates).where(eq(calendars.id, calendarId)).run()
  return { success: true }
})
