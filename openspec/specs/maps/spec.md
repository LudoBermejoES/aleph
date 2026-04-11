# maps Specification

## Purpose

TBD - created by archiving change campaign-manager-study. Update Purpose after archive.

## Requirements

### Requirement: Map Image Upload and Display

The system SHALL support uploading custom map images and displaying them as pannable, zoomable canvases. Every uploaded map SHALL be tiled into 256x256 PNG tiles at multiple zoom levels, preserving the original aspect ratio. The viewer SHALL always use tiled rendering.

#### Scenario: Uploading a map

- **WHEN** an editor uploads a map image (PNG, JPEG, WebP up to 100MB)
- **THEN** the image is stored as `original{ext}` in `content/campaigns/{slug}/maps/{mapSlug}/`
- **AND** the server immediately triggers background tile generation
- **AND** tiles are generated at multiple zoom levels in `tiles/{z}/{x}/{y}.png`
- **AND** the map's `isTiled` flag is set to `true` after tile generation completes

#### Scenario: Tile generation preserves aspect ratio

- **WHEN** tiles are generated from an uploaded image
- **THEN** the image is resized using `fit: 'contain'` (no stretching or distortion)
- **AND** edge tiles that extend beyond the image content are padded with transparent pixels
- **AND** the number of zoom levels is calculated as `Math.ceil(Math.log2(maxDim / 256))` where `maxDim = Math.max(width, height)`

#### Scenario: Small image upload

- **WHEN** an image smaller than 4096px in both dimensions is uploaded
- **THEN** tiles are still generated (1-3 zoom levels)
- **AND** the map renders via tileLayer identically to large maps

#### Scenario: Map navigation

- **WHEN** a user views a tiled map
- **THEN** they can pan (drag), zoom (scroll/pinch), and reset view
- **AND** zoom levels range from 0 (full image in ~1 tile) to maxZoom (1:1 pixel ratio)
- **AND** the map stays within bounds with a small padding allowance

### Requirement: Leaflet Integration

The system SHALL render all maps using Leaflet.js with CRS.Simple and L.tileLayer. The `imageOverlay` fallback SHALL NOT be used.

#### Scenario: Rendering a tiled map

- **WHEN** the user navigates to a map view
- **THEN** Leaflet initializes with CRS.Simple
- **AND** an `L.tileLayer` is configured with the map's tile URL, calculated maxZoom, 256px tile size, noWrap, and bounds matching the image dimensions
- **AND** the map fits to the image bounds on load

#### Scenario: Zoom levels derived from image dimensions

- **WHEN** the MapViewer component receives map width and height
- **THEN** it calculates `maxZoom = Math.ceil(Math.log2(Math.max(width, height) / 256))`
- **AND** minZoom is set to 0
- **AND** the `tileLayer` uses these zoom bounds

#### Scenario: Out-of-bounds tiles return transparent PNG

- **WHEN** Leaflet requests a tile at coordinates outside the image area
- **THEN** the server returns a 1x1 transparent PNG (not a 404)
- **AND** the response includes `Cache-Control: public, max-age=604800`

### Requirement: Map Pins (Markers)

The system SHALL support placing interactive pins on maps that link to wiki entities.

#### Scenario: Pin rendering on Leaflet map

- GIVEN a map with associated pin records in the database
- WHEN the Leaflet map finishes loading
- THEN all pins are rendered as Leaflet markers at their stored x/y coordinates
- AND each marker displays a tooltip on hover with the pin name

#### Scenario: Creating a pin

- GIVEN a DM editing a map
- WHEN they click a location and create a pin
- THEN they can set: name, icon (from icon library), color, size, and optional link to a wiki entity
- AND pin position is stored as x/y pixel coordinates in the database

#### Scenario: Pin interaction

- GIVEN a user viewing a map with pins
- WHEN they hover over a pin
- THEN a tooltip shows the pin name and linked entity preview (image, type, brief description)
- AND clicking the pin navigates to the linked entity page
- AND right-clicking shows options: Edit Pin, Go to Entity, Copy Link

#### Scenario: Pin visibility and permissions

- GIVEN pins with different visibility levels (public, members, dm_only, specific_users)
- WHEN a Player views the map
- THEN only pins they have permission to see are rendered
- AND hidden pins leave no trace (no blank space, no "something is here" indicators)

#### Scenario: Pin groups

- GIVEN a map with many pins categorized into groups (e.g., "Cities", "Dungeons", "Points of Interest")
- WHEN the user opens the map legend panel
- THEN they can toggle entire groups on/off
- AND each group has a name, color, and icon
- AND the DM can set default visibility per group

### Requirement: Map Layers

The system SHALL support transparent overlay layers on maps.

#### Scenario: Adding a layer

- GIVEN a DM editing a map
- WHEN they add a new layer (upload a transparent PNG overlay)
- THEN the layer is rendered above the base map at the same scale
- AND layers can be: political boundaries, climate zones, trade routes, fog of war, etc.

#### Scenario: Layer toggling

- GIVEN a map with multiple layers
- WHEN the user opens the layers panel
- THEN they can toggle each layer on/off independently
- AND layer order (z-index) can be rearranged by the DM

#### Scenario: Layer visibility

- GIVEN layers with visibility settings
- WHEN a Player views the map
- THEN they only see layers permitted for their role
- AND DM-only layers (e.g., secret dungeon entrance overlay) are hidden

### Requirement: Nested Map Hierarchy

The system SHALL support linking maps to create a drill-down hierarchy.

#### Scenario: World-to-city drill-down

- GIVEN a world map with a pin for "City of Vallaki"
- WHEN the pin is configured to link to a city map
- THEN clicking the pin transitions to the city map (with optional zoom animation)
- AND breadcrumb navigation shows: World Map > Barovia Region > City of Vallaki

#### Scenario: Breadcrumb navigation

- GIVEN a user is viewing a dungeon map 3 levels deep
- WHEN they click a breadcrumb level
- THEN they navigate directly to that parent map
- AND the parent map centers on the pin that links to where they came from

### Requirement: Map Regions and Paths

The system SHALL support drawing regions (territories) and paths (roads, rivers) on maps.

#### Scenario: Drawing a region

- GIVEN a DM editing a map
- WHEN they use the region tool to draw a polygon
- THEN the region displays with configurable fill color, opacity, border style, and label
- AND the region can be linked to a wiki entity (e.g., a kingdom, biome)
- AND clicking the region shows its linked entity tooltip

#### Scenario: Drawing a path

- GIVEN a DM editing a map
- WHEN they draw a path (polyline)
- THEN the path displays with configurable color, width, and style (solid, dashed, dotted)
- AND the path can represent roads, rivers, trade routes, or borders
- AND if the map has a calibrated scale, the path shows its distance

### Requirement: Map Scale and Measurement

The system SHALL support calibrated map scales and distance measurement.

#### Scenario: Setting map scale

- GIVEN a DM setting up a map
- WHEN they define a scale (e.g., "1 inch = 5 miles" or calibrate by marking a known distance)
- THEN the map displays a dynamic scale bar
- AND distance measurements use the calibrated scale

#### Scenario: Measuring distance

- GIVEN a user viewing a calibrated map
- WHEN they use the measure tool to click two or more points
- THEN the straight-line or path distance is displayed in the map's configured units

### Requirement: Re-tile existing maps

The system SHALL provide a migration task to re-generate tiles for all existing maps using the new aspect-ratio-safe tiling algorithm.

#### Scenario: Running the re-tile migration

- **WHEN** an administrator runs the `maps:retile-all` task
- **THEN** all maps with an original image file on disk are re-tiled
- **AND** maps with missing image files are skipped with a warning log
- **AND** each map's `isTiled` flag is set to `true` after successful tiling

### Requirement: Map detail page has a delete action

The map detail page SHALL include a destructive Delete button, gated to `dm` and `co_dm` roles, that triggers a confirmation dialog and calls `DELETE /api/campaigns/:id/maps/:slug` on confirmation, then redirects to the map list. The server-side handler already removes associated tiles and files.

#### Scenario: DM can delete a map from the detail page

- **WHEN** a DM views a map detail page and clicks Delete
- **AND** confirms the dialog
- **THEN** the map and its tiles are deleted
- **AND** the user is redirected to `/campaigns/:id/maps`
