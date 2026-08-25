/**
 * Pure, dependency-free coordinate math shared by MapViewer.client.vue for rendering pins
 * and for converting a drag-and-drop location back into what gets stored.
 *
 * openspec/changes/add-osm-maps/design.md D2 draws the line: an 'image' map's pins are
 * stored in CRS.Simple-scaled PIXEL units derived from the image's own dimensions; an 'osm'
 * map's pins are stored as real WGS84 degrees, untouched. Keeping the math here (rather than
 * inline in the component) makes it testable without mounting Leaflet.
 */

export type MapType = 'image' | 'osm'

/**
 * `dataTransfer` MIME type used by the drag-and-drop entity picker (design.md D6) to carry
 * the dragged entity's id from the picker panel to MapViewer.client.vue's drop handler.
 */
export const ENTITY_DRAG_MIME = 'application/x-aleph-entity-id'

export interface LatLng {
  lat: number
  lng: number
}

export interface ImageMapGeometry {
  /** Leaflet zoom level at which the full image renders at (near) its native resolution. */
  maxZoom: number
  /** Image height expressed in CRS.Simple units (negative-lat convention, see below). */
  boundsHeight: number
  /** Image width expressed in CRS.Simple units. */
  boundsWidth: number
  /** Pixel -> CRS.Simple-unit scale factor (CRS units per source pixel). */
  pinScale: number
}

const DEFAULT_IMAGE_WIDTH = 1024
const DEFAULT_IMAGE_HEIGHT = 768

/**
 * Derives the CRS.Simple geometry MapViewer needs for an 'image' map from its pixel
 * dimensions -- the same math `onMounted` already used inline before this extraction.
 */
export function computeImageMapGeometry(
  imageWidth = DEFAULT_IMAGE_WIDTH,
  imageHeight = DEFAULT_IMAGE_HEIGHT,
): ImageMapGeometry {
  const maxDim = Math.max(imageWidth, imageHeight)
  const maxZoom = Math.ceil(Math.log2(maxDim / 256))
  const pinScale = 256 / maxDim
  return {
    maxZoom,
    boundsHeight: imageHeight * pinScale,
    boundsWidth: imageWidth * pinScale,
    pinScale,
  }
}

/**
 * Convert a pin's stored pixel-space `lat`/`lng` (an 'image' map) into the Leaflet
 * CRS.Simple coordinate used to render its marker. Leaflet's Y grows upward, the image's
 * grows downward, hence the sign flip on lat -- matching the render code this replaces.
 */
export function imagePinToLeafletLatLng(
  pin: LatLng,
  imageWidth = DEFAULT_IMAGE_WIDTH,
  imageHeight = DEFAULT_IMAGE_HEIGHT,
): [number, number] {
  const { pinScale } = computeImageMapGeometry(imageWidth, imageHeight)
  return [-pin.lat * pinScale, pin.lng * pinScale]
}

/**
 * Inverse of `imagePinToLeafletLatLng`: convert a dropped/clicked Leaflet CRS.Simple point
 * back into the pixel-space `lat`/`lng` an 'image' map's pins are stored in
 * (design.md D6's drop handler).
 */
export function leafletLatLngToImagePin(
  latlng: LatLng,
  imageWidth = DEFAULT_IMAGE_WIDTH,
  imageHeight = DEFAULT_IMAGE_HEIGHT,
): LatLng {
  const { pinScale } = computeImageMapGeometry(imageWidth, imageHeight)
  return { lat: -latlng.lat / pinScale, lng: latlng.lng / pinScale }
}

/** An 'osm' map's pin `lat`/`lng` are real WGS84 degrees -- used directly, no transform. */
export function osmPinToLeafletLatLng(pin: LatLng): [number, number] {
  return [pin.lat, pin.lng]
}

/** Inverse is the identity too: a dropped point on an 'osm' map IS the WGS84 coordinate. */
export function leafletLatLngToOsmPin(latlng: LatLng): LatLng {
  return { lat: latlng.lat, lng: latlng.lng }
}

/** Dispatches to the image/osm pin->Leaflet transform by map type. */
export function pinToLeafletLatLng(
  pin: LatLng,
  mapType: MapType,
  imageWidth?: number,
  imageHeight?: number,
): [number, number] {
  return mapType === 'osm'
    ? osmPinToLeafletLatLng(pin)
    : imagePinToLeafletLatLng(pin, imageWidth, imageHeight)
}

/** Dispatches to the image/osm Leaflet->pin transform by map type (design.md D6's drop handler). */
export function leafletLatLngToPin(
  latlng: LatLng,
  mapType: MapType,
  imageWidth?: number,
  imageHeight?: number,
): LatLng {
  return mapType === 'osm'
    ? leafletLatLngToOsmPin(latlng)
    : leafletLatLngToImagePin(latlng, imageWidth, imageHeight)
}

// ─── L.map() constructor options (design.md D1) ───────────────────────────────
//
// Pulled out as plain data so the CRS.Simple vs default-CRS decision -- and the
// fitBounds-on-a-pixel-box vs setView-on-a-stored-center decision -- are unit-testable
// without mounting Leaflet. `crs` is a string sentinel here (not an `L.CRS` instance)
// because this module must stay dependency-free; MapViewer.client.vue translates it to the
// real `L.CRS.Simple` (or omits the option entirely for 'default').

export interface ImageMapInitOptions {
  crs: 'simple'
  minZoom: number
  maxZoom: number
  boundsHeight: number
  boundsWidth: number
}

export interface OsmMapInitOptions {
  crs: 'default'
  center: [number, number]
  zoom: number
}

/** 'image' map init options (design.md D1's unmodified path): CRS.Simple + a pixel-derived bounds box. */
export function buildImageMapInitOptions(
  imageWidth = DEFAULT_IMAGE_WIDTH,
  imageHeight = DEFAULT_IMAGE_HEIGHT,
): ImageMapInitOptions {
  const { maxZoom, boundsHeight, boundsWidth } = computeImageMapGeometry(imageWidth, imageHeight)
  return { crs: 'simple', minZoom: 0, maxZoom, boundsHeight, boundsWidth }
}

/**
 * 'osm' map init options (design.md D1's new path): Leaflet's default CRS (EPSG:3857,
 * never CRS.Simple) and a `setView` at the map's stored center/zoom instead of `fitBounds`
 * on a pixel box.
 */
export function buildOsmMapInitOptions(
  centerLat: number | null | undefined,
  centerLng: number | null | undefined,
  defaultZoom: number | null | undefined,
): OsmMapInitOptions {
  return {
    crs: 'default',
    center: [centerLat ?? 0, centerLng ?? 0],
    zoom: defaultZoom ?? 2,
  }
}
