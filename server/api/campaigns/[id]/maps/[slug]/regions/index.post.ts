import { randomUUID } from 'crypto'
import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../../utils/db'
import { maps, mapRegions } from '../../../../../../db/schema/maps'
import { hasMinRole } from '../../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) throw createError({ statusCode: 403, message: 'Editors or above can create regions' })

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const body = await readBody(event)
  const db = useDb()

  const map = db.select().from(maps).where(and(eq(maps.campaignId, campaignId), eq(maps.slug, slug))).get()
  if (!map) throw createError({ statusCode: 404, message: 'Map not found' })

  const id = randomUUID()
  db.insert(mapRegions).values({
    id,
    mapId: map.id,
    name: body.name || null,
    geojson: typeof body.geojson === 'string' ? body.geojson : JSON.stringify(body.geojson),
    color: body.color || null,
    opacity: body.opacity ?? 0.3,
    entityId: body.entityId || null,
    visibility: body.visibility || 'public',
  }).run()

  return { id }
})
