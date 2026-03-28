## Context

Aleph uses Leaflet.js with CRS.Simple for map rendering. Maps are uploaded as PNG/JPEG/WebP images (up to 100MB). Large images (>4096px) trigger background tile generation; smaller ones display via `imageOverlay`. Both paths have aspect ratio issues:

- `imageOverlay` stretches the image to fill the Leaflet bounds rectangle
- The tiling service uses `sharp.resize(w, h, { fit: 'fill' })` which distorts aspect ratio

The Arcadia project solves this with a proven approach: ALL maps are tiled (512px tiles), a resolution pyramid calculates zoom levels from image dimensions, and the viewer uses a custom tile grid with Y-axis flip. This design adapts that pattern for Leaflet in the Nuxt stack.

## Goals / Non-Goals

**Goals:**
- Fix aspect ratio distortion for all maps (tiled and non-tiled)
- Always tile every uploaded map — eliminate the `imageOverlay` path entirely
- Match the proven Arcadia tile generation and rendering approach
- Preserve existing features: pins, layers, groups, regions, drawing tools, breadcrumbs
- Re-tile existing maps via a migration task

**Non-Goals:**
- Switching from Leaflet to OpenLayers (Leaflet is already installed and working for pins/regions/drawing)
- Changing the tile storage path or API endpoint structure
- Modifying pins, layers, regions, or drawing tools (those work correctly)
- Changing the map upload form or creation flow

## Decisions

### 1. Tile size: 256px (keep current)

Arcadia uses 512px tiles, but Leaflet's default is 256px and the existing tile endpoint already serves 256px tiles. Changing would break existing tiles and require updating the tile serve endpoint. 256px is standard for Leaflet and works well.

**Alternative considered:** 512px like Arcadia. Rejected because it would require changes to the serve endpoint, break cached tiles, and Leaflet handles 256px natively.

### 2. Resolution pyramid derived from image dimensions

The resolution at each zoom level is: `resolution[z] = maxDim / (tileSize * 2^z)`

At zoom level 0, the entire image fits in ~1 tile. At the max zoom level, each tile shows 256px of the original image (1:1 pixel ratio). This matches how Arcadia calculates it.

Max zoom levels: `Math.ceil(Math.log2(maxDim / tileSize))` where `maxDim = Math.max(width, height)`.

### 3. Tiling with aspect ratio preservation

Use `sharp.resize({ fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })` to resize to the target dimensions WITHOUT distorting. The image is letterboxed with transparent pixels. Edge tiles that extend beyond the image content are padded with transparency.

For each zoom level z:
1. Calculate the target dimensions: `scaledW = Math.ceil(width * scale)`, `scaledH = Math.ceil(height * scale)` where `scale = tileSize * 2^z / maxDim`
2. Resize the original with `fit: 'contain'` (preserves aspect ratio)
3. Extract 256x256 tiles, padding edge tiles with transparency

### 4. Always tile — remove threshold

Every uploaded map gets tiled, regardless of size. A 200x200 icon gets 1-2 zoom levels; a 10000x5000 map gets 6-7. The `needsTiling()` function and threshold are removed. The upload endpoint always triggers the background tiling task and sets `isTiled = true` after completion.

### 5. MapViewer always uses tileLayer

Remove the `imageOverlay` branch entirely. The viewer always creates an `L.tileLayer` with:

```javascript
const maxDim = Math.max(width, height)
const maxZoom = Math.ceil(Math.log2(maxDim / 256))
const bounds = L.latLngBounds([0, 0], [height, width])

L.tileLayer(tileUrl, {
  tileSize: 256,
  minZoom: 0,
  maxZoom: maxZoom,
  noWrap: true,
  bounds: bounds,
}).addTo(map)

map.fitBounds(bounds)
map.setMaxBounds(bounds.pad(0.25))
```

The `bounds` option on `tileLayer` prevents Leaflet from requesting tiles outside the image area. The `maxZoom` is calculated from image dimensions, not hardcoded.

### 6. Y-axis handling

Leaflet CRS.Simple has Y increasing upward, but image pixels have Y increasing downward. The tile generation stores tiles in the standard `z/x/y.png` layout where y=0 is the top row. The tile URL template uses `{y}` directly — Leaflet with CRS.Simple and the `bounds` option handles the coordinate mapping.

### 7. Re-tile migration task

A one-time Nitro task (`maps:retile-all`) iterates all maps with `imagePath` set, regenerates tiles using the new service, and sets `isTiled = true`. This runs as a CLI command or background task.

## Risks / Trade-offs

- **Tile generation for small images is wasteful but harmless**: A 500x300 image generates ~5 tiles. Disk cost is negligible. The benefit is a single rendering path.
- **Re-tiling existing maps**: The migration task must handle maps whose original image files may have been deleted. Mitigation: skip maps with missing files and log warnings.
- **Background tiling delay**: After upload, the map shows "generating tiles…" until tiling completes. This is the existing behavior and is acceptable — tiling a 10000px image takes ~5-15 seconds.
- **Leaflet tile coordinate edge cases**: CRS.Simple with bounds-constrained tileLayer is well-tested in the Leaflet ecosystem. The main gotcha is maxZoom calculation — off-by-one errors would cause blurry or missing tiles at highest zoom.
