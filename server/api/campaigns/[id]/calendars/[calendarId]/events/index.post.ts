import { z } from 'zod'
import { randomUUID } from 'crypto'
import { useDb } from '../../../../../../utils/db'
import { validateBody } from '../../../../../../utils/validate'
import { calendarEvents } from '../../../../../../db/schema/calendars'
import { hasMinRole } from '../../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) throw createError({ statusCode: 403, message: 'Editors or above can create events' })

  const calendarId = getRouterParam(event, 'calendarId')!
  const calendarEventSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    date: z.record(z.string(), z.unknown()),
    endDate: z.record(z.string(), z.unknown()).optional(),
    isRecurring: z.boolean().optional(),
    recurrence: z.record(z.string(), z.unknown()).optional(),
    linkedEntityId: z.string().optional(),
    visibility: z.string().optional(),
  })
  const body = await validateBody(event, calendarEventSchema)
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
