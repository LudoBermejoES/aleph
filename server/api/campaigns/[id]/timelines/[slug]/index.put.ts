import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { timelines } from '../../../../../db/schema/calendars'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can update timelines' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const body = await readBody(event)
  const db = useDb()

  const timeline = db.select().from(timelines)
    .where(and(eq(timelines.campaignId, campaignId), eq(timelines.slug, slug)))
    .get()
  if (!timeline) throw createError({ statusCode: 404, message: 'Timeline not found' })

  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (body.name !== undefined) updates.name = body.name
  if (body.description !== undefined) updates.description = body.description
  if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder

  db.update(timelines).set(updates).where(eq(timelines.id, timeline.id)).run()

  return { success: true }
})
