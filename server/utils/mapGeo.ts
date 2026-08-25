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
