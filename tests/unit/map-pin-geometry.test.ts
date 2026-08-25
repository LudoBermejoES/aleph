import { describe, it, expect } from 'vitest'
import {
  computeImageMapGeometry,
  imagePinToLeafletLatLng,
  leafletLatLngToImagePin,
  osmPinToLeafletLatLng,
  leafletLatLngToOsmPin,
  pinToLeafletLatLng,
  leafletLatLngToPin,
  buildImageMapInitOptions,
  buildOsmMapInitOptions,
} from '../../app/utils/mapPinGeometry'

describe('computeImageMapGeometry', () => {
  it('matches the maxZoom formula documented in the Leaflet Integration spec', () => {
    const { maxZoom } = computeImageMapGeometry(1024, 768)
    expect(maxZoom).toBe(Math.ceil(Math.log2(1024 / 256)))
  })

  it('scales bounds so the largest dimension is 256 CRS units at zoom 0', () => {
    const { boundsWidth, boundsHeight, pinScale } = computeImageMapGeometry(2048, 1024)
    expect(pinScale).toBeCloseTo(256 / 2048)
    expect(boundsWidth).toBeCloseTo(256)
    expect(boundsHeight).toBeCloseTo(128)
  })
})

describe('image map pin <-> Leaflet transform (design.md D2/D6)', () => {
  it('flips lat sign and scales both axes when rendering a pin', () => {
    const [lat, lng] = imagePinToLeafletLatLng({ lat: 100, lng: 200 }, 1024, 768)
    const scale = 256 / 1024
    expect(lat).toBeCloseTo(-100 * scale)
    expect(lng).toBeCloseTo(200 * scale)
  })

  it('round-trips a dropped Leaflet point back to the original pixel coordinate', () => {
    const original = { lat: 400, lng: 150 }
    const [leafletLat, leafletLng] = imagePinToLeafletLatLng(original, 1024, 768)
    const restored = leafletLatLngToImagePin({ lat: leafletLat, lng: leafletLng }, 1024, 768)
    expect(restored.lat).toBeCloseTo(original.lat)
    expect(restored.lng).toBeCloseTo(original.lng)
  })

  it('defaults to 1024x768 when dimensions are not provided (matches MapViewer defaults)', () => {
    const [lat, lng] = imagePinToLeafletLatLng({ lat: 100, lng: 100 })
    const scale = 256 / 1024
    expect(lat).toBeCloseTo(-100 * scale)
    expect(lng).toBeCloseTo(100 * scale)
  })
})

describe('osm map pin <-> Leaflet transform (design.md D2/D6)', () => {
  it('passes lat/lng through unmodified when rendering a pin', () => {
    expect(osmPinToLeafletLatLng({ lat: 52.52, lng: 13.405 })).toEqual([52.52, 13.405])
  })

  it('passes a dropped point through unmodified when storing a pin', () => {
    expect(leafletLatLngToOsmPin({ lat: 52.52, lng: 13.405 })).toEqual({ lat: 52.52, lng: 13.405 })
  })
})

describe('pinToLeafletLatLng / leafletLatLngToPin dispatch by map type', () => {
  it('dispatches to the image transform for an image map', () => {
    const [lat, lng] = pinToLeafletLatLng({ lat: 100, lng: 200 }, 'image', 1024, 768)
    const [expectedLat, expectedLng] = imagePinToLeafletLatLng({ lat: 100, lng: 200 }, 1024, 768)
    expect(lat).toBeCloseTo(expectedLat)
    expect(lng).toBeCloseTo(expectedLng)
  })

  it('dispatches to the osm transform for an osm map, ignoring image dimensions', () => {
    const result = pinToLeafletLatLng({ lat: 52.52, lng: 13.405 }, 'osm', 999, 999)
    expect(result).toEqual([52.52, 13.405])
  })

  it('leafletLatLngToPin round-trips for both map types', () => {
    const imageDrop = leafletLatLngToPin({ lat: -25, lng: 50 }, 'image', 1024, 768)
    expect(imageDrop).toEqual(leafletLatLngToImagePin({ lat: -25, lng: 50 }, 1024, 768))

    const osmDrop = leafletLatLngToPin({ lat: 48.85, lng: 2.35 }, 'osm')
    expect(osmDrop).toEqual({ lat: 48.85, lng: 2.35 })
  })
})

describe('buildImageMapInitOptions / buildOsmMapInitOptions (task 4.4, design.md D1)', () => {
  it('image map options request CRS.Simple, never the default CRS', () => {
    const options = buildImageMapInitOptions(1024, 768)
    expect(options.crs).toBe('simple')
    expect(options.minZoom).toBe(0)
    expect(options.maxZoom).toBe(Math.ceil(Math.log2(1024 / 256)))
  })

  it('osm map options request the default CRS, never CRS.Simple', () => {
    const options = buildOsmMapInitOptions(52.52, 13.405, 12)
    expect(options.crs).toBe('default')
  })

  it('osm map options carry the stored center and zoom for setView (not fitBounds)', () => {
    const options = buildOsmMapInitOptions(52.52, 13.405, 12)
    expect(options.center).toEqual([52.52, 13.405])
    expect(options.zoom).toBe(12)
  })

  it('osm map options fall back to a sane default center/zoom when unset', () => {
    const options = buildOsmMapInitOptions(null, null, null)
    expect(options.center).toEqual([0, 0])
    expect(options.zoom).toBe(2)
  })

  it('osm and image map options are never both CRS.Simple for the same request', () => {
    const image = buildImageMapInitOptions(2048, 1024)
    const osm = buildOsmMapInitOptions(0, 0, 3)
    expect(image.crs).not.toBe(osm.crs)
  })
})
