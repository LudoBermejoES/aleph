import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../../../utils/db'
import { validateBody } from '../../../../../../../utils/validate'
import { maps, mapPins } from '../../../../../../../db/schema/maps'
import { hasMinRole } from '../../../../../../../utils/permissions'
import { isWithinWgs84, pinUpdateSchema } from '../../../../../../../utils/mapGeo'
import { getPinWithEntity } from '../../../../../../../services/maps'
import type { CampaignRole } from '../../../../../../../utils/permissions'

// design.md D2 (add-pin-rename, superseding move-pins-and-resolve-entity-images's original
// "coordinates only" rule): a PATCH that accepts `lat`/`lng` (only as a pair) and/or `label`,
// independently of each other -- not a PUT, which would invite colour/entity changes this
// endpoint still does not want. `pinUpdateSchema` is the schema that decides that boundary;
// `color`/`entityId`/anything else sent alongside is still silently dropped by `.parse()`,
// exactly as before this schema existed.
export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor'))
    throw createError({ statusCode: 403, message: 'Editors or above can update pins' })

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const pinId = getRouterParam(event, 'pinId')!
  const body = await validateBody(event, pinUpdateSchema)
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

  const updates: { lat?: number; lng?: number; label?: string | null } = {}

  if (body.lat !== undefined && body.lng !== undefined) {
    // Same range check the POST applies: only makes sense for an 'osm' map -- an 'image'
    // map's pixel coordinates routinely exceed +/-90/+/-180 and that is expected, not an
    // error. Skipped entirely for a label-only PATCH, which carries no coordinates to check.
    if (map.type === 'osm' && !isWithinWgs84(body.lat, body.lng)) {
      throw createError({
        statusCode: 422,
        message: 'lat/lng out of range for an OSM map (-90..90 / -180..180)',
      })
    }
    updates.lat = body.lat
    updates.lng = body.lng
  }

  if (body.label !== undefined) {
    // design.md D4: clearing a label means "derive from the entity again", never an empty
    // string sitting in the column indistinguishable from "not set" to anything that ever
    // checks `label !== null` (this backfill's own equality check does exactly that).
    const trimmed = body.label?.trim() ?? null
    updates.label = trimmed || null
  }

  db.update(mapPins).set(updates).where(eq(mapPins.id, pinId)).run()

  // Return the same shape the GET/POST endpoints return -- reuse getPinWithEntity rather
  // than hand-assembling the response, the exact mistake that cost a server-side fix in
  // improve-map-pin-markers-and-deletion.
  const userId = event.context.user?.id || ''
  return await getPinWithEntity(db, pinId, role, userId)
})
