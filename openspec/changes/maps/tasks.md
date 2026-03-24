# Tasks: Maps

## 1. Database Schema

- [ ] 1.1 Create `maps` schema with parent_map_id, image_path, dimensions, tiling fields
- [ ] 1.2 Create `map_pins` schema with coordinates, entity link, icon, color, group, child_map_id
- [ ] 1.3 Create `map_layers` schema with type, opacity, sort order
- [ ] 1.4 Create `map_groups` schema with visibility default
- [ ] 1.5 Create `map_regions` schema with GeoJSON storage
- [ ] 1.6 Generate and apply migration

## 2. Service Layer (`server/services/maps.ts`)

- [ ] 2.1 Implement `computeBreadcrumb(db, mapId)` -- recursive CTE for map ancestor chain
- [ ] 2.2 Implement `filterPinsByVisibility(pins, role)` -- strips hidden pins for non-DM roles
- [ ] 2.3 Implement `validateMapImage(file)` -- validates image dimensions and format
- [ ] 2.4 Implement `generateTiles(imagePath, outputDir)` -- tiles large images for Leaflet

## 3. Map CRUD API

- [ ] 3.1 Wire map create/read/update/delete handlers (thin handlers calling DB)
- [ ] 3.2 Wire image upload handler with `validateMapImage` service, filesystem storage, and sharp metadata
- [ ] 3.3 Wire nested map listing handler with parent_map_id filter
- [ ] 3.4 Wire breadcrumb handler calling `computeBreadcrumb` service

## 4. Pin, Layer & Region API

- [ ] 4.1 Wire pin CRUD handlers
- [ ] 4.2 Wire layer CRUD handlers with sort order management
- [ ] 4.3 Wire map group CRUD handlers
- [ ] 4.4 Wire region CRUD handlers (GeoJSON storage)
- [ ] 4.5 Add permission checks: pin/region visibility via `filterPinsByVisibility` service

## 5. Tiling Pipeline

- [ ] 5.1 Implement `generateTiles` in service layer (sharp-based, 256x256 tiles, PNG)
- [ ] 5.2 Create background Nitro task calling `generateTiles` service on upload
- [ ] 5.3 Store tiles at `content/campaigns/{slug}/maps/{map}/tiles/{z}/{x}/{y}.png`
- [ ] 5.4 Update map record with `is_tiled = true` on completion
- [ ] 5.5 Add tile serving endpoint

## 6. Map Viewer Component

- [ ] 6.1 Create `MapViewer.vue` component wrapping Leaflet.js with CRS.Simple
- [ ] 6.2 Implement image overlay mode for non-tiled maps
- [ ] 6.3 Implement tile layer mode for tiled maps
- [ ] 6.4 Render pins as L.marker with custom L.divIcon (color, icon)
- [ ] 6.5 Build pin click popup with entity preview (name, type, thumbnail)
- [ ] 6.6 Implement shift+click drill-down to child map
- [ ] 6.7 Build layer toggle panel in sidebar
- [ ] 6.8 Build group visibility toggle controls

## 7. Drawing Tools

- [ ] 7.1 Integrate Leaflet-Geoman for polygon and polyline drawing
- [ ] 7.2 Save drawn shapes to map_regions via API
- [ ] 7.3 Render existing regions as L.geoJSON layer with styling

## 8. Map Pages

- [ ] 8.1 Create `app/pages/campaigns/[id]/maps/index.vue` (map list with thumbnails)
- [ ] 8.2 Create `app/pages/campaigns/[id]/maps/[slug].vue` (map viewer page)
- [ ] 8.3 Build map creation/edit form (name, parent map, image upload)
- [ ] 8.4 Add breadcrumb navigation component for nested maps

## 9. Tests (TDD)

### Unit Tests -- Service Functions (Vitest)

- [ ] 9.1 Test `computeBreadcrumb`: returns correct ancestor chain for deeply nested map (3 levels)
- [ ] 9.2 Test `computeBreadcrumb`: returns single element for root map (no parent)
- [ ] 9.3 Test `filterPinsByVisibility`: DM role sees all pins including hidden; player role sees only visible pins
- [ ] 9.4 Test `filterPinsByVisibility`: pins linked to entities with restricted visibility are stripped for non-DM
- [ ] 9.5 Test `validateMapImage`: accepts valid image formats (png, jpg, webp); rejects unsupported formats
- [ ] 9.6 Test `validateMapImage`: rejects images exceeding maximum dimension limits
- [ ] 9.7 Test `generateTiles`: produces correct `{z}/{x}/{y}.png` path structure for given image dimensions

### Schema Tests (`:memory:` SQLite)

- [ ] 9.8 Test maps table: parent_map_id self-referential FK; deleting parent map cascades to children
- [ ] 9.9 Test map_pins table: pin with entity_id FK; pin with child_map_id FK; nullable fields accept null
- [ ] 9.10 Test map_layers table: sort_order uniqueness within a map; layer type enum constraint
- [ ] 9.11 Test map_regions table: GeoJSON stored as text; entity_id FK nullable

### Integration Tests (API)

- [ ] 9.12 Test map CRUD: create map returns slug; read returns map with dimensions; update changes name; delete removes map
- [ ] 9.13 Test pin CRUD: create pin with coordinates and entity link; read pin returns entity reference; delete removes pin
- [ ] 9.14 Test pin with child_map_id: creating pin linked to child map enables drill-down query
- [ ] 9.15 Test layer CRUD: create layers with sort order; toggle layer visibility; verify sort order management
- [ ] 9.16 Test nested map listing: GET maps with parent_map_id filter returns only direct children
- [ ] 9.17 Test pin visibility filtering: player cannot see pins on entities they lack permission for; DM sees all pins
- [ ] 9.18 Test region CRUD: create region with GeoJSON polygon; read returns valid GeoJSON; delete removes region
- [ ] 9.19 Test image upload endpoint: accepts image file, stores to filesystem, returns dimensions
- [ ] 9.20 Test breadcrumb API: returns correct ancestor chain via recursive CTE for nested map

### Component Tests

- [ ] 9.21 Test breadcrumb navigation component: renders ancestor maps as links with correct hierarchy
- [ ] 9.22 Test layer toggle panel: renders layer list, emits toggle events for visibility changes
