# Proposal: Maps

## Why

Visual maps are essential for spatial storytelling in TTRPGs. DMs need to upload world maps, dungeon layouts, and city plans, then pin entities to locations so players can explore the world visually. Nested maps (world → region → city → building) create a drill-down experience that mirrors how players navigate a campaign setting.

## What Changes

- Implement map CRUD with image upload and storage
- Integrate Leaflet.js with CRS.Simple for rendering custom image maps
- Build map pin system with entity linking, custom icons, colors, and visibility controls
- Support map layers (standard and overlay) with toggle controls
- Add map groups for organizational pin clustering
- Implement nested map hierarchy with parent_map_id and breadcrumb navigation
- Add pin click popup with entity preview and shift+click drill-down
- Integrate Leaflet-Geoman for freehand region and path drawing
- Build tiling pipeline for large images (>4K pixels)

## Scope

### In scope
- Map CRUD API and image upload to filesystem
- Leaflet.js CRS.Simple map viewer component
- Map pins with coordinates, entity link, icon, color, visibility
- Map layers and layer toggle UI
- Map groups for pin organization
- Nested maps with parent_map_id and breadcrumb navigation via recursive CTE
- Pin popup with linked entity preview
- Shift+click drill-down to child maps
- Leaflet-Geoman for drawing regions/paths on maps
- Tiling pipeline (sharp) for images exceeding 4K resolution

### Out of scope
- Real-time collaborative map editing (future)
- Fog of war (future enhancement)
- 3D maps

## Dependencies
- 01-project-setup
- 02-auth-rbac
- 03-markdown-engine
- 04-wiki-core
