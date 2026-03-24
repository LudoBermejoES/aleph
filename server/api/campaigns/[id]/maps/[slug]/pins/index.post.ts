import { randomUUID } from 'crypto'
import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../../utils/db'
import { maps, mapPins } from '../../../../../../db/schema/maps'
import { hasMinRole } from '../../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) throw createError({ statusCode: 403, message: 'Editors or above can create pins' })

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const body = await readBody(event)
  const db = useDb()

  const map = db.select().from(maps).where(and(eq(maps.campaignId, campaignId), eq(maps.slug, slug))).get()
  if (!map) throw createError({ statusCode: 404, message: 'Map not found' })

  const id = randomUUID()
  db.insert(mapPins).values({
    id,
    mapId: map.id,
    entityId: body.entityId || null,
    childMapId: body.childMapId || null,
    label: body.label || null,
    lat: body.lat,
    lng: body.lng,
    icon: body.icon || null,
    color: body.color || null,
    visibility: body.visibility || 'public',
    groupId: body.groupId || null,
  }).run()

  return { id }
})
