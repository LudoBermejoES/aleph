## MODIFIED Requirements

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
- **WHEN** the Leaflet map finishes loading
- **THEN** all pins are rendered as Leaflet markers at their stored lat/lng coordinates (pixel coordinates in CRS.Simple)
- **AND** each marker displays a tooltip on hover with the pin name

#### Scenario: Creating a pin
- **WHEN** a DM editing a map clicks a location and creates a pin
- **THEN** they can set: name, icon, color, and optional link to a wiki entity
- **AND** pin position is stored as lat/lng pixel coordinates in the database

#### Scenario: Pin visibility and permissions
- **WHEN** a Player views the map
- **THEN** only pins they have permission to see are rendered
- **AND** hidden pins leave no trace

#### Scenario: Pin groups
- **WHEN** the user opens the map legend panel
- **THEN** they can toggle entire groups on/off
- **AND** each group has a name, color, and icon

### Requirement: Map Layers

The system SHALL support transparent overlay layers on maps.

#### Scenario: Adding a layer
- **WHEN** a DM adds a new layer (upload a transparent PNG overlay)
- **THEN** the layer is rendered above the base map at the same scale

#### Scenario: Layer toggling
- **WHEN** the user opens the layers panel
- **THEN** they can toggle each layer on/off independently

### Requirement: Nested Map Hierarchy

The system SHALL support linking maps to create a drill-down hierarchy.

#### Scenario: World-to-city drill-down
- **WHEN** a pin is configured to link to a child map
- **THEN** shift+clicking the pin transitions to the child map
- **AND** breadcrumb navigation shows the ancestor chain

### Requirement: Map Regions and Paths

The system SHALL support drawing regions (territories) and paths (roads, rivers) on maps.

#### Scenario: Drawing a region
- **WHEN** a DM uses the drawing tools to create a polygon
- **THEN** the region displays with configurable fill color, opacity, and border
- **AND** the region can be linked to a wiki entity

### Requirement: Re-tile existing maps

The system SHALL provide a migration task to re-generate tiles for all existing maps using the new aspect-ratio-safe tiling algorithm.

#### Scenario: Running the re-tile migration
- **WHEN** an administrator runs the `maps:retile-all` task
- **THEN** all maps with an original image file on disk are re-tiled
- **AND** maps with missing image files are skipped with a warning log
- **AND** each map's `isTiled` flag is set to `true` after successful tiling
