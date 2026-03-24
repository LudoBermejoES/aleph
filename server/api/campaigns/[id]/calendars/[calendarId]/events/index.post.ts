import { randomUUID } from 'crypto'
import { useDb } from '../../../../../../utils/db'
import { calendarEvents } from '../../../../../../db/schema/calendars'
import { hasMinRole } from '../../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) throw createError({ statusCode: 403, message: 'Editors or above can create events' })

  const calendarId = getRouterParam(event, 'calendarId')!
  const body = await readBody(event)
  const db = useDb()
  const id = randomUUID()

  db.insert(calendarEvents).values({
    id,
    calendarId,
    name: body.name,
    description: body.description || null,
    dateJson: JSON.stringify(body.date),
    endDateJson: body.endDate ? JSON.stringify(body.endDate) : null,
    isRecurring: body.isRecurring || false,
    recurrenceJson: body.recurrence ? JSON.stringify(body.recurrence) : null,
    linkedEntityId: body.linkedEntityId || null,
    visibility: body.visibility || 'public',
    createdAt: new Date(),
  }).run()

  return { id }
})
