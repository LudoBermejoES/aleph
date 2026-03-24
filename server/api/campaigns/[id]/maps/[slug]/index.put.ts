import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { maps } from '../../../../../db/schema/maps'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) throw createError({ statusCode: 403, message: 'Editors or above can edit maps' })

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const body = await readBody(event)
  const db = useDb()

  const map = db.select().from(maps).where(and(eq(maps.campaignId, campaignId), eq(maps.slug, slug))).get()
  if (!map) throw createError({ statusCode: 404, message: 'Map not found' })

  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (body.name !== undefined) updates.name = body.name
  if (body.visibility !== undefined) updates.visibility = body.visibility
  if (body.parentMapId !== undefined) updates.parentMapId = body.parentMapId

  db.update(maps).set(updates).where(eq(maps.id, map.id)).run()
  return { success: true }
})
