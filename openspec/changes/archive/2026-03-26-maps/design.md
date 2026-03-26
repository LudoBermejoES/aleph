# Design: Maps

## Technical Approach

### Map Storage

- `maps` table: `id, campaign_id, name, slug, parent_map_id, image_path, width, height, min_zoom, max_zoom, is_tiled, visibility, created_at, updated_at`
- Images stored at `content/campaigns/{slug}/maps/{map_slug}/original.{ext}`
- Tiles stored at `content/campaigns/{slug}/maps/{map_slug}/tiles/{z}/{x}/{y}.png`

### Leaflet.js Integration

- Use `L.CRS.Simple` for pixel-coordinate mapping on custom images
- Bounds calculated from image dimensions: `[[0, 0], [height, width]]`
- `L.imageOverlay` for non-tiled maps; `L.tileLayer` for tiled maps
- Zoom range: `min_zoom` to `max_zoom` (computed from image size)

### Pin System

- `map_pins` table: `id, map_id, entity_id (nullable), label, lat, lng, icon, color, visibility, group_id, child_map_id (nullable)`
- Pins rendered as `L.marker` with custom `L.divIcon` for colored icons
- Click → popup with entity name, type, image thumbnail, and "Open" link
- Shift+click → navigate to `child_map_id` if set (drill-down)

### Layers & Groups

- `map_layers` table: `id, map_id, name, type (standard|overlay), image_path, opacity, sort_order, visible_default`
- `map_groups` table: `id, map_id, name, color, visible_default`
- Layer toggle panel in sidebar; overlay layers rendered via additional `L.imageOverlay` instances
- Groups control pin visibility as a batch

### Nested Map Hierarchy

- `parent_map_id` foreign key on `maps` table (self-referential)
- Breadcrumb navigation via recursive CTE (same pattern as entity nesting)
- Map list page shows top-level maps; child maps accessible via drill-down pins

### Drawing Tools

- Leaflet-Geoman (`@geoman-io/leaflet-geoman-free`) for polygon regions and polyline paths
- Drawn shapes stored in `map_regions` table: `id, map_id, name, geojson, color, opacity, entity_id, visibility`
- GeoJSON stored as text column; rendered with `L.geoJSON` layer

### Tiling Pipeline

- On upload, if image width or height > 4096px, generate tile pyramid using `sharp`
- Tile size: 256x256, format: PNG
- Process runs as a background Nitro task; map marked `is_tiled = true` on completion
- Fallback to `L.imageOverlay` while tiling is in progress

### Service Layer (TDD)

Business logic extracted into `server/services/maps.ts` -- pure functions tested in isolation:

- `computeBreadcrumb(db, mapId)` -- recursive CTE for map ancestor chain
- `filterPinsByVisibility(pins, role)` -- strips hidden pins for non-DM roles
- `validateMapImage(file)` -- validates image dimensions and format
- `generateTiles(imagePath, outputDir)` -- tiles large images for Leaflet

Architecture: Write unit tests first (TDD red phase), then implement service functions (green phase), then refactor API handlers to call services. API handlers stay thin -- they call services + DB, return results.

Test layers:
1. **Unit tests**: service functions in isolation (no DB, no server)
2. **Schema tests**: DB constraints and cascades (`:memory:` SQLite)
3. **Integration tests**: API contracts against running server

### API Endpoints

```
GET/POST       /api/campaigns/:id/maps
GET/PUT/DELETE /api/campaigns/:id/maps/:slug
POST           /api/campaigns/:id/maps/:slug/upload
GET/POST       /api/campaigns/:id/maps/:slug/pins
PUT/DELETE     /api/campaigns/:id/maps/:slug/pins/:pinId
GET/POST       /api/campaigns/:id/maps/:slug/layers
GET/POST       /api/campaigns/:id/maps/:slug/regions
```
