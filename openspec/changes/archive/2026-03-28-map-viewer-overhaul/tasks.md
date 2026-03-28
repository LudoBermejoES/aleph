## 1. Tiling Service Rewrite

- [x] 1.1 Rewrite `server/services/tiling.ts` — use `sharp.resize({ fit: 'contain', background: transparent })` instead of `fit: 'fill'`; calculate zoom levels as `Math.ceil(Math.log2(maxDim / tileSize))`; pad edge tiles with transparency; store tiles as `{z}/{x}/{y}.png`
- [x] 1.2 Remove the `needsTiling(width, height)` threshold function from `server/services/maps.ts`
- [x] 1.3 Update `server/api/campaigns/[id]/maps/[slug]/upload.post.ts` — always trigger tiling (remove the `if (requiresTiling)` conditional); always set `isTiled = false` initially, let the task flip it to `true`

## 2. Tile Background Task

- [x] 2.1 Update `server/tasks/maps/tile.ts` — use the rewritten tiling service; set `isTiled = true` on the map record after successful generation

## 3. Tile Serving

- [x] 3.1 Review `server/api/campaigns/[id]/maps/[slug]/tiles/[z]/[x]/[y].get.ts` — ensure it returns a 1x1 transparent PNG for missing tiles (not 404); confirm `Cache-Control: public, max-age=604800` header

## 4. MapViewer Component Rewrite

- [x] 4.1 Rewrite `app/components/MapViewer.client.vue` — remove the `imageOverlay` branch; always use `L.tileLayer` with calculated `maxZoom`, `tileSize: 256`, `noWrap: true`, and `bounds` matching image dimensions
- [x] 4.2 Calculate `maxZoom = Math.ceil(Math.log2(Math.max(width, height) / 256))` in the component; set `minZoom: 0`; configure `map.fitBounds(bounds)` and `map.setMaxBounds(bounds.pad(0.25))`
- [x] 4.3 Preserve existing functionality: pins, layers panel, groups panel, regions (GeoJSON), drawing tools (Geoman), emit events (`pinClick`, `pinShiftClick`, `regionCreated`)

## 5. Re-tile Migration Task

- [x] 5.1 Create `server/tasks/maps/retile-all.ts` — iterate all maps with `imagePath` set; for each, check original file exists on disk; regenerate tiles using new service; set `isTiled = true`; skip and log warning for missing files

## 6. Tests

- [x] 6.1 Unit test: `server/services/tiling.ts` — verify tiles are generated without aspect ratio distortion; verify edge tiles are padded with transparency; verify zoom level calculation matches `Math.ceil(Math.log2(maxDim / 256))`
- [x] 6.2 Integration test: upload a map image → verify tiles are generated → verify GET `/tiles/0/0/0` returns a valid PNG → verify out-of-bounds tile returns transparent PNG
- [x] 6.3 E2E test: upload a map → navigate to map view → verify the Leaflet container renders with tile layer visible

## 7. Verification

- [x] 7.1 Run `npm run build` — confirm no errors
- [x] 7.2 Run `npx vitest run tests/unit/` — all unit tests pass
- [x] 7.3 Run `npx vitest run tests/integration/` — all integration tests pass
- [ ] 7.4 Manual test: upload a non-square image (e.g. 800x400) → verify it displays without stretching
