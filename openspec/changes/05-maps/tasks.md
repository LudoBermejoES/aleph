# Tasks: Maps

## 1. Database Schema

- [ ] 1.1 Create `maps` schema with parent_map_id, image_path, dimensions, tiling fields
- [ ] 1.2 Create `map_pins` schema with coordinates, entity link, icon, color, group, child_map_id
- [ ] 1.3 Create `map_layers` schema with type, opacity, sort order
- [ ] 1.4 Create `map_groups` schema with visibility default
- [ ] 1.5 Create `map_regions` schema with GeoJSON storage
- [ ] 1.6 Generate and apply migration

## 2. Map CRUD API

- [ ] 2.1 Implement map create/read/update/delete endpoints
- [ ] 2.2 Implement image upload endpoint with filesystem storage
- [ ] 2.3 Add image dimension detection on upload (sharp metadata)
- [ ] 2.4 Implement nested map listing with parent_map_id filter
- [ ] 2.5 Add breadcrumb ancestor query via recursive CTE

## 3. Pin, Layer & Region API

- [ ] 3.1 Implement pin CRUD endpoints
- [ ] 3.2 Implement layer CRUD endpoints with sort order management
- [ ] 3.3 Implement map group CRUD endpoints
- [ ] 3.4 Implement region CRUD endpoints (GeoJSON storage)
- [ ] 3.5 Add permission checks: pin/region visibility respects RBAC

## 4. Tiling Pipeline

- [ ] 4.1 Build sharp-based tile generator (256x256 tiles, PNG)
- [ ] 4.2 Create background Nitro task for tile generation on upload
- [ ] 4.3 Store tiles at `content/campaigns/{slug}/maps/{map}/tiles/{z}/{x}/{y}.png`
- [ ] 4.4 Update map record with `is_tiled = true` on completion
- [ ] 4.5 Add tile serving endpoint

## 5. Map Viewer Component

- [ ] 5.1 Create `MapViewer.vue` component wrapping Leaflet.js with CRS.Simple
- [ ] 5.2 Implement image overlay mode for non-tiled maps
- [ ] 5.3 Implement tile layer mode for tiled maps
- [ ] 5.4 Render pins as L.marker with custom L.divIcon (color, icon)
- [ ] 5.5 Build pin click popup with entity preview (name, type, thumbnail)
- [ ] 5.6 Implement shift+click drill-down to child map
- [ ] 5.7 Build layer toggle panel in sidebar
- [ ] 5.8 Build group visibility toggle controls

## 6. Drawing Tools

- [ ] 6.1 Integrate Leaflet-Geoman for polygon and polyline drawing
- [ ] 6.2 Save drawn shapes to map_regions via API
- [ ] 6.3 Render existing regions as L.geoJSON layer with styling

## 7. Map Pages

- [ ] 7.1 Create `app/pages/campaigns/[id]/maps/index.vue` (map list with thumbnails)
- [ ] 7.2 Create `app/pages/campaigns/[id]/maps/[slug].vue` (map viewer page)
- [ ] 7.3 Build map creation/edit form (name, parent map, image upload)
- [ ] 7.4 Add breadcrumb navigation component for nested maps

## 8. Tests (TDD)

### Unit Tests (Vitest)

- [ ] 8.1 Test breadcrumb ancestor query via recursive CTE: returns correct ancestor chain for deeply nested map
- [ ] 8.2 Test tile path generation: produces correct `{z}/{x}/{y}.png` path structure

### Integration Tests (@nuxt/test-utils)

- [ ] 8.3 Test map CRUD: create map returns slug; read returns map with dimensions; update changes name; delete removes map
- [ ] 8.4 Test pin CRUD: create pin with coordinates and entity link; read pin returns entity reference; delete removes pin
- [ ] 8.5 Test pin with child_map_id: creating pin linked to child map enables drill-down query
- [ ] 8.6 Test layer CRUD: create layers with sort order; toggle layer visibility; verify sort order management
- [ ] 8.7 Test nested map listing: GET maps with parent_map_id filter returns only direct children
- [ ] 8.8 Test pin visibility filtering: player cannot see pins on entities they lack permission for; DM sees all pins
- [ ] 8.9 Test region CRUD: create region with GeoJSON polygon; read returns valid GeoJSON; delete removes region
- [ ] 8.10 Test image upload endpoint: accepts image file, stores to filesystem, returns dimensions

### Component Tests (@vue/test-utils)

- [ ] 8.11 Test breadcrumb navigation component: renders ancestor maps as links with correct hierarchy
- [ ] 8.12 Test layer toggle panel: renders layer list, emits toggle events for visibility changes
