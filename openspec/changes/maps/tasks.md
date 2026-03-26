# Tasks: Maps

## 1. Database Schema

- [x] 1.1 Create `maps` schema with parent_map_id, image_path, dimensions, tiling fields
- [x] 1.2 Create `map_pins` schema with coordinates, entity link, icon, color, group, child_map_id
- [x] 1.3 Create `map_layers` schema with type, opacity, sort order
- [x] 1.4 Create `map_groups` schema with visibility default
- [x] 1.5 Create `map_regions` schema with GeoJSON storage
- [x] 1.6 Generate and apply migration

## 2. Service Layer (`server/services/maps.ts`)

- [x] 2.1 Implement `computeBreadcrumb(db, mapId)` -- recursive CTE for map ancestor chain
- [x] 2.2 Implement `filterPinsByVisibility(pins, role)` -- strips hidden pins for non-DM roles
- [x] 2.3 Implement `validateMapImage(file)` -- validates image dimensions and format
- [x] 2.4 Implement `needsTiling` and `computeTileLevels` utilities

## 3. Map CRUD API

- [x] 3.1 Wire map create/read/update/delete handlers
- [x] 3.2 Wire image upload handler with `validateMapImage` service + image serving endpoint
- [x] 3.3 Wire nested map listing handler with parent_map_id filter
- [x] 3.4 Wire breadcrumb via `computeBreadcrumb` service in map GET

## 4. Pin, Layer & Region API

- [x] 4.1 Wire pin CRUD handlers (GET list, POST create, DELETE)
- [x] 4.2 Wire layer CRUD handlers (GET list, POST create)
- [x] 4.3 Wire map group CRUD handlers
- [x] 4.4 Wire region CRUD handlers (GET list, POST create with GeoJSON)
- [x] 4.5 Add permission checks: pin/region visibility via `filterPinsByVisibility`

## 5. Tiling Pipeline

- [x] 5.1 Implement `generateTiles` with sharp (256x256 tiles, PNG)
- [x] 5.2 Create background Nitro task for tiling on upload (manual call for now)
- [x] 5.3 Store tiles at `content/campaigns/{slug}/maps/{map}/tiles/{z}/{x}/{y}.png`
- [x] 5.4 Update map record with `is_tiled = true` on upload
- [x] 5.5 Add tile serving endpoint

## 6. Map Viewer Component

- [x] 6.1 Create `MapViewer.vue` wrapping Leaflet.js with CRS.Simple
- [x] 6.2 Implement image overlay mode for non-tiled maps
- [x] 6.3 Implement tile layer mode for tiled maps
- [x] 6.4 Render pins as L.marker with custom L.divIcon (colored circles)
- [x] 6.5 Build pin click popup with entity preview link
- [x] 6.6 Implement shift+click drill-down to child map
- [x] 6.7 Build layer toggle panel (checkbox sidebar)
- [x] 6.8 Build group visibility toggle (checkbox sidebar, re-renders pins)

## 7. Drawing Tools

- [x] 7.1 Integrate Leaflet-Geoman for polygon drawing (pm controls in MapViewer)
- [x] 7.2 Save drawn shapes to map_regions via API (pm:create event handler)
- [x] 7.3 Render existing regions as L.geoJSON layer

## 8. Map Pages

- [x] 8.1 Create `app/pages/campaigns/[id]/maps/index.vue` (map list)
- [x] 8.2 Create `app/pages/campaigns/[id]/maps/[slug].vue` (map detail with breadcrumb)
- [x] 8.3 Build map creation/edit form with image upload UI
- [x] 8.4 Add breadcrumb navigation component for nested maps

## 9. Tests (TDD)

### Unit Tests -- Service Functions (Vitest)

- [x] 9.1 Test `computeBreadcrumb`: correct ancestor chain for 3 levels
- [x] 9.2 Test `computeBreadcrumb`: single element for root map
- [x] 9.3 Test `filterPinsByVisibility`: DM sees all, player sees visible only
- [x] 9.4 Test `filterPinsByVisibility`: visitor sees only public
- [x] 9.5 Test `validateMapImage`: accepts PNG, JPEG, WebP
- [x] 9.6 Test `validateMapImage`: rejects unsupported formats and oversized files
- [x] 9.7 Test `computeBreadcrumb`: empty for nonexistent map

### Schema Tests (`:memory:` SQLite)

- [x] 9.8 Test breadcrumb recursive CTE with 3-level nesting
- [x] 9.9 Test map_pins FK to entity and child_map
- [x] 9.10 Test map_layers sort order
- [x] 9.11 Test map_regions GeoJSON storage

### Integration Tests (API)

- [x] 9.12 Test map CRUD: create, read, update, delete
- [x] 9.13 Test pin CRUD: create with coordinates, read, delete
- [x] 9.14 Test nested map breadcrumb: child returns 2-element breadcrumb
- [x] 9.15 Test layer create with sort order
- [x] 9.16 Test region create with GeoJSON, read returns valid GeoJSON
- [x] 9.17 Test pin visibility filtering for non-DM
- [x] 9.18 Test image upload endpoint
- [x] 9.19 Test nested map listing with parent_map_id filter

### Component Tests

- [x] 9.20 Test breadcrumb navigation component
- [x] 9.21 Test layer toggle panel
