import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../../utils/db'
import { calendarEvents } from '../../../../../../db/schema/calendars'
import { hasMinRole } from '../../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can delete calendar events' })
  }

  const calendarId = getRouterParam(event, 'calendarId')!
  const eventId = getRouterParam(event, 'eventId')!
  const db = useDb()

  const calendarEvent = db
    .select()
    .from(calendarEvents)
    .where(and(eq(calendarEvents.id, eventId), eq(calendarEvents.calendarId, calendarId)))
    .get()
  if (!calendarEvent) throw createError({ statusCode: 404, message: 'Calendar event not found' })

  db.delete(calendarEvents).where(eq(calendarEvents.id, calendarEvent.id)).run()

  return { success: true }
})
