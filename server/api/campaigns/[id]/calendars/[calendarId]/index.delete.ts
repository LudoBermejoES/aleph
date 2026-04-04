import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { calendars } from '../../../../../db/schema/calendars'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'co_dm')) {
    throw createError({ statusCode: 403, message: 'Co-DM or above can delete calendars' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const calendarId = getRouterParam(event, 'calendarId')!
  const db = useDb()

  const calendar = db.select().from(calendars)
    .where(and(eq(calendars.campaignId, campaignId), eq(calendars.id, calendarId)))
    .get()
  if (!calendar) throw createError({ statusCode: 404, message: 'Calendar not found' })

  db.delete(calendars).where(eq(calendars.id, calendar.id)).run()

  return { success: true }
})
