import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../../../utils/db'
import { validateBody } from '../../../../../../../utils/validate'
import { maps, mapPins } from '../../../../../../../db/schema/maps'
import { hasMinRole } from '../../../../../../../utils/permissions'
import { isWithinWgs84, pinCoordinatesSchema } from '../../../../../../../utils/mapGeo'
import { getPinWithEntity } from '../../../../../../../services/maps'
import type { CampaignRole } from '../../../../../../../utils/permissions'

// design.md D2 (move-pins-and-resolve-entity-images): a PATCH that accepts ONLY
// coordinates -- not a PUT, which would invite label/colour/entity changes this endpoint
// explicitly does not want. `pinCoordinatesSchema` is the same piece `index.post.ts`
// validates pin creation with, so a value the POST would refuse cannot arrive here either.
// `validateBody`'s zod `.parse()` strips any other field (label/color/entityId/...) the
// client sends, so they are silently ignored rather than applied.
export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor'))
    throw createError({ statusCode: 403, message: 'Editors or above can move pins' })

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const pinId = getRouterParam(event, 'pinId')!
  const body = await validateBody(event, pinCoordinatesSchema)
  const db = useDb()

  const map = db
    .select()
    .from(maps)
    .where(and(eq(maps.campaignId, campaignId), eq(maps.slug, slug)))
    .get()
  if (!map) throw createError({ statusCode: 404, message: 'Map not found' })

  const existing = db.select().from(mapPins).where(eq(mapPins.id, pinId)).get()
  if (!existing || existing.mapId !== map.id)
    throw createError({ statusCode: 404, message: 'Pin not found' })

  // Same range check the POST applies (design.md D2 references it directly): only makes
  // sense for an 'osm' map -- an 'image' map's pixel coordinates routinely exceed
  // +/-90/+/-180 and that is expected, not an error.
  if (map.type === 'osm' && !isWithinWgs84(body.lat, body.lng)) {
    throw createError({
      statusCode: 422,
      message: 'lat/lng out of range for an OSM map (-90..90 / -180..180)',
    })
  }

  db.update(mapPins).set({ lat: body.lat, lng: body.lng }).where(eq(mapPins.id, pinId)).run()

  // Return the same shape the GET/POST endpoints return (design.md D2) -- reuse
  // getPinWithEntity rather than hand-assembling the response, the exact mistake that cost
  // a server-side fix in improve-map-pin-markers-and-deletion.
  const userId = event.context.user?.id || ''
  return getPinWithEntity(db, pinId, role, userId)
})
