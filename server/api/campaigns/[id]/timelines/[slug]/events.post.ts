import { z } from 'zod'
import { randomUUID } from 'crypto'
import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { validateBody } from '../../../../../utils/validate'
import { timelines, timelineEvents } from '../../../../../db/schema/calendars'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor'))
    throw createError({ statusCode: 403, message: 'Editors or above can add timeline events' })

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const timelineEventSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    date: z.record(z.string(), z.unknown()),
    endDate: z.record(z.string(), z.unknown()).optional(),
    era: z.string().optional(),
    linkedEntityId: z.string().optional(),
    sortOrder: z.number().optional(),
  })
  const body = await validateBody(event, timelineEventSchema)
  const db = useDb()

  const tl = db
    .select()
    .from(timelines)
    .where(and(eq(timelines.campaignId, campaignId), eq(timelines.slug, slug)))
    .get()
  if (!tl) throw createError({ statusCode: 404, message: 'Timeline not found' })

  const id = randomUUID()
  db.insert(timelineEvents)
    .values({
      id,
      timelineId: tl.id,
      name: body.name,
      description: body.description || null,
      dateJson: JSON.stringify(body.date),
      endDateJson: body.endDate ? JSON.stringify(body.endDate) : null,
      era: body.era || null,
      linkedEntityId: body.linkedEntityId || null,
      sortOrder: body.sortOrder || 0,
      createdAt: new Date(),
    })
    .run()

  return { id }
})
