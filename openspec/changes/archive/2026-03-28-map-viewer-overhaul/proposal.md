## Why

The current map viewer has two critical problems:

1. **Aspect ratio distortion**: The tiling service uses `sharp.resize(w, h, { fit: 'fill' })` which stretches the image to fit the target dimensions, distorting the aspect ratio. Non-tiled maps use Leaflet `imageOverlay` which also stretches to fill the bounds rectangle regardless of the original aspect ratio.

2. **Always-tile approach is wrong**: The current system only tiles images > 4096px and uses `imageOverlay` for smaller ones. But `imageOverlay` stretches to fill bounds, causing distortion. The proven approach from the Arcadia project tiles ALL maps (any size) and uses Leaflet's `tileLayer` with a proper custom projection, tile grid, resolution pyramid, and Y-axis flip — which preserves aspect ratio perfectly at all zoom levels.

The Arcadia project has a battle-tested map system using OpenLayers with custom pixel projections, 512px tiles, resolution pyramids, and GeoJSON markers — running in production with maps up to 10155x3948px. This change brings that same approach to Aleph, adapted for Leaflet (already installed) and the existing Nuxt/Nitro stack.

## What Changes

- **Rewrite tiling service** (`server/services/tiling.ts`): Use `sharp.resize({ fit: 'inside' })` to preserve aspect ratio. Pad tiles to full tile size with transparent pixels. Always generate tiles regardless of image size.
- **Always tile on upload**: Remove the 4096px threshold — tile every uploaded map image. Set `isTiled = true` after generation.
- **Fix tile coordinate system**: Implement proper resolution pyramid and Y-axis flip in both tile generation and serving, matching the Arcadia pattern.
- **Rewrite `MapViewer.client.vue`**: Replace the dual-path (imageOverlay vs tileLayer) approach with always-tiled rendering. Configure Leaflet with a proper resolution array, tile grid bounds, and correct zoom range derived from image dimensions.
- **Remove `imageOverlay` fallback**: All maps render via tileLayer. The viewer calculates zoom levels and resolutions from map dimensions.
- **Update tile serving endpoint**: Return transparent tile for out-of-bounds requests. Add proper cache headers.
- **Re-tile existing maps**: Provide a migration task that re-generates tiles for all existing maps.

## Capabilities

### New Capabilities
- (none — this is an overhaul of existing capability)

### Modified Capabilities
- `maps`: Tiling service rewrite (aspect-ratio-safe), always-tile strategy, MapViewer rewrite with resolution pyramid and proper tile grid configuration

## Impact

- **`server/services/tiling.ts`** — Full rewrite: aspect-ratio-safe resize, transparent padding, resolution pyramid
- **`server/services/maps.ts`** — Remove `needsTiling()` threshold; always tile
- **`server/api/campaigns/[id]/maps/[slug]/upload.post.ts`** — Always trigger tiling, set `isTiled = true`
- **`server/api/campaigns/[id]/maps/[slug]/tiles/[z]/[x]/[y].get.ts`** — Verify tile serving, transparent fallback
- **`app/components/MapViewer.client.vue`** — Full rewrite: always-tiled, resolution pyramid, proper bounds
- **`server/tasks/maps/tile.ts`** — Update to use new tiling service
- **CLI**: No impact (maps are not managed via CLI)
- **Tests**: Update tiling unit tests, MapViewer integration
