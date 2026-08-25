import type { CampaignMap, MapPin, MapLayer, MapRegion } from '~/types/api'

export function useMapApi(campaignId: string) {
  const base = `/api/campaigns/${campaignId}`

  // ─── Maps ───────────────────────────────────────────────────────────────────

  function getMaps(params?: Record<string, string>) {
    return $fetch<CampaignMap[]>(`${base}/maps`, { params })
  }

  function getMap(slug: string) {
    return $fetch<CampaignMap>(`${base}/maps/${slug}`)
  }

  function createMap(body: Record<string, unknown>) {
    return $fetch<CampaignMap>(`${base}/maps`, { method: 'POST', body })
  }

  function updateMap(slug: string, body: Record<string, unknown>) {
    return $fetch<CampaignMap>(`${base}/maps/${slug}`, { method: 'PUT', body })
  }

  function deleteMap(slug: string) {
    return $fetch(`${base}/maps/${slug}`, { method: 'DELETE' })
  }

  function uploadMapImage(slug: string, formData: FormData) {
    return $fetch(`${base}/maps/${slug}/upload`, { method: 'POST', body: formData })
  }

  function getMapLayers(slug: string) {
    return $fetch<MapLayer[]>(`${base}/maps/${slug}/layers`)
  }

  function getMapPins(slug: string) {
    return $fetch<MapPin[]>(`${base}/maps/${slug}/pins`)
  }

  function getMapRegions(slug: string) {
    return $fetch<MapRegion[]>(`${base}/maps/${slug}/regions`)
  }

  function updateMapRegions(slug: string, body: unknown) {
    return $fetch(`${base}/maps/${slug}/regions`, {
      method: 'PUT',
      body: body as Record<string, unknown>,
    })
  }

  function updateMapLayer(mapSlug: string, layerId: string, body: Record<string, unknown>) {
    return $fetch(`${base}/maps/${mapSlug}/layers/${layerId}`, { method: 'PUT', body })
  }

  function deleteMapLayer(mapSlug: string, layerId: string) {
    return $fetch(`${base}/maps/${mapSlug}/layers/${layerId}`, { method: 'DELETE' })
  }

  function updateMapRegion(mapSlug: string, regionId: string, body: Record<string, unknown>) {
    return $fetch(`${base}/maps/${mapSlug}/regions/${regionId}`, { method: 'PUT', body })
  }

  function deleteMapRegion(mapSlug: string, regionId: string) {
    return $fetch(`${base}/maps/${mapSlug}/regions/${regionId}`, { method: 'DELETE' })
  }

  // ─── Pins ───────────────────────────────────────────────────────────────────

  /**
   * Create a pin via drag-and-drop (design.md D6) or any other UI path -- there was
   * previously no client-side function for the already-existing `POST .../pins` endpoint.
   *
   * Returns the full `MapPin` row (design.md D1) -- the same shape `getMapPins`/`getMap`
   * return, entityImageUrl/entityType included -- so the caller can append it directly to
   * its pins array instead of refetching.
   */
  function createMapPin(
    slug: string,
    body: {
      lat: number
      lng: number
      entityId?: string
      childMapId?: string
      label?: string
      icon?: string
      color?: string
      visibility?: string
      groupId?: string
    },
  ) {
    return $fetch<MapPin>(`${base}/maps/${slug}/pins`, { method: 'POST', body })
  }

  /**
   * Delete a pin (improve-map-pin-markers-and-deletion) -- the endpoint already existed and
   * the CLI already reached it (`aleph map pin-delete`); this was the missing client method
   * for the UI's delete affordance.
   */
  function deleteMapPin(slug: string, pinId: string) {
    return $fetch(`${base}/maps/${slug}/pins/${pinId}`, { method: 'DELETE' })
  }

  /**
   * Move a pin to new coordinates (move-pins-and-resolve-entity-images/design.md D2) -- a
   * PATCH, not a PUT, and it accepts only `{ lat, lng }`. Returns the full `MapPin` row (the
   * same shape `getMapPins`/`createMapPin` return) so the caller can update
   * `mapData.value.pins[i]` in place instead of refetching.
   */
  function moveMapPin(slug: string, pinId: string, body: { lat: number; lng: number }) {
    return $fetch<MapPin>(`${base}/maps/${slug}/pins/${pinId}`, { method: 'PATCH', body })
  }

  // ─── Geocoding ──────────────────────────────────────────────────────────────

  /**
   * Server-side geocoding for an 'osm' map's initial view (design.md D3). Never call this
   * per-keystroke -- the caller is responsible for an explicit search action or a debounce.
   */
  function geocodeAddress(query: string) {
    return $fetch<{ candidates: { displayName: string; lat: number; lng: number }[] }>(
      `${base}/maps/geocode`,
      { method: 'POST', body: { query } },
    )
  }

  return {
    getMaps,
    getMap,
    createMap,
    updateMap,
    deleteMap,
    uploadMapImage,
    getMapLayers,
    updateMapLayer,
    deleteMapLayer,
    getMapPins,
    createMapPin,
    deleteMapPin,
    moveMapPin,
    getMapRegions,
    updateMapRegions,
    updateMapRegion,
    deleteMapRegion,
    geocodeAddress,
  }
}
