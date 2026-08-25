import { z } from 'zod'

/**
 * Shared map-type/geo validation, used by both map create/update and pin create/update
 * endpoints so the two agree on what a legal `osm` coordinate looks like
 * (openspec/changes/add-osm-maps/design.md D2).
 */

export const MAP_TYPES = ['image', 'osm'] as const
export type MapType = (typeof MAP_TYPES)[number]

export const mapTypeSchema = z.enum(MAP_TYPES)

/** Optional map-center/zoom fields shared by the map create and update schemas. */
export const mapGeoFieldsSchema = z.object({
  type: mapTypeSchema.optional(),
  centerLat: z.number().min(-90).max(90).optional(),
  centerLng: z.number().min(-180).max(180).optional(),
  defaultZoom: z.number().int().min(0).optional(),
})

/**
 * The coordinate pair shared by pin creation (`POST .../pins`) and pin movement
 * (`PATCH .../pins/[pinId]`), so a value the POST would refuse cannot arrive through the
 * PATCH (openspec/changes/move-pins-and-resolve-entity-images/design.md D2).
 */
export const pinCoordinatesSchema = z.object({
  lat: z.number(),
  lng: z.number(),
})

/**
 * `PATCH .../pins/[pinId]`'s body (add-pin-rename/design.md D2): a partial update of ONE pin,
 * accepting `lat`/`lng` (only as a pair, same as `pinCoordinatesSchema`) and/or `label`,
 * independently of each other. `color`/`entityId`/anything else sent alongside is still
 * silently dropped by `.parse()`, unchanged from before this schema existed.
 *
 * At least one of the two groups must be present -- an empty PATCH body doing nothing is
 * rejected rather than accepted as a silent no-op.
 */
export const pinUpdateSchema = z
  .object({
    lat: z.number().optional(),
    lng: z.number().optional(),
    label: z.string().nullable().optional(),
  })
  .refine((data) => (data.lat === undefined) === (data.lng === undefined), {
    message: 'lat and lng must be provided together',
  })
  .refine((data) => data.lat !== undefined || data.label !== undefined, {
    message: 'At least one of lat/lng or label must be provided',
  })

const WGS84_LAT_RANGE: [number, number] = [-90, 90]
const WGS84_LNG_RANGE: [number, number] = [-180, 180]

export function isWithinWgs84(lat: number, lng: number): boolean {
  return (
    lat >= WGS84_LAT_RANGE[0] &&
    lat <= WGS84_LAT_RANGE[1] &&
    lng >= WGS84_LNG_RANGE[0] &&
    lng <= WGS84_LNG_RANGE[1]
  )
}
