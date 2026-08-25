import { z } from 'zod'
import { randomUUID } from 'crypto'
import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../../utils/db'
import { validateBody } from '../../../../../../utils/validate'
import { maps, mapPins } from '../../../../../../db/schema/maps'
import { hasMinRole } from '../../../../../../utils/permissions'
import { isWithinWgs84, pinCoordinatesSchema } from '../../../../../../utils/mapGeo'
import { getPinWithEntity } from '../../../../../../services/maps'
import type { CampaignRole } from '../../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor'))
    throw createError({ statusCode: 403, message: 'Editors or above can create pins' })

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  // design.md D2 (move-pins-and-resolve-entity-images): lat/lng come from the SAME schema
  // piece the PATCH move endpoint validates with, so a value this POST would refuse can't
  // arrive through the PATCH either.
  const pinSchema = pinCoordinatesSchema.extend({
    entityId: z.string().optional(),
    childMapId: z.string().optional(),
    label: z.string().optional(),
    icon: z.string().optional(),
    color: z.string().optional(),
    visibility: z.string().optional(),
    groupId: z.string().optional(),
  })
  const body = await validateBody(event, pinSchema)
  const db = useDb()

  const map = db
    .select()
    .from(maps)
    .where(and(eq(maps.campaignId, campaignId), eq(maps.slug, slug)))
    .get()
  if (!map) throw createError({ statusCode: 404, message: 'Map not found' })

  // design.md D2: the range check only makes sense for an 'osm' map -- an 'image' map's
  // pixel coordinates routinely exceed +/-90/+/-180 and that is expected, not an error.
  if (map.type === 'osm' && !isWithinWgs84(body.lat, body.lng)) {
    throw createError({
      statusCode: 422,
      message: 'lat/lng out of range for an OSM map (-90..90 / -180..180)',
    })
  }

  const id = randomUUID()
  db.insert(mapPins)
    .values({
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
    })
    .run()

  // Return the same shape the GET endpoints return (design.md D1): the client appends this
  // straight onto mapData.value.pins instead of refetching, so it must already carry
  // entityImageUrl/entityType or a freshly-dropped pin would render as a plain dot until the
  // next full reload.
  const userId = event.context.user?.id || ''
  return await getPinWithEntity(db, id, role, userId)
})
