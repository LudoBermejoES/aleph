import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../../../utils/db'
import { maps, mapLayers } from '../../../../../../../db/schema/maps'
import { hasMinRole } from '../../../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor'))
    throw createError({ statusCode: 403, message: 'Editors or above can update map layers' })

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const layerId = getRouterParam(event, 'layerId')!
  const body = await readBody(event)
  const db = useDb()

  const map = db
    .select()
    .from(maps)
    .where(and(eq(maps.campaignId, campaignId), eq(maps.slug, slug)))
    .get()
  if (!map) throw createError({ statusCode: 404, message: 'Map not found' })

  const layer = db.select().from(mapLayers).where(eq(mapLayers.id, layerId)).get()
  if (!layer || layer.mapId !== map.id)
    throw createError({ statusCode: 404, message: 'Layer not found' })

  const updates: Partial<typeof mapLayers.$inferInsert> = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.type !== undefined) updates.type = body.type
  if (body.opacity !== undefined) updates.opacity = body.opacity
  if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder
  if (body.visibleDefault !== undefined) updates.visibleDefault = body.visibleDefault

  db.update(mapLayers).set(updates).where(eq(mapLayers.id, layerId)).run()

  return { success: true }
})
