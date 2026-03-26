# maps Specification

## Purpose
TBD - created by archiving change campaign-manager-study. Update Purpose after archive.
## Requirements
### Requirement: Map Image Upload and Display

The system SHALL support uploading custom map images and displaying them as pannable, zoomable canvases.

#### Scenario: Uploading a map
- GIVEN a DM or Editor user
- WHEN they upload a map image (PNG, JPEG, WEBP up to 50MB, up to 16384x16384 pixels)
- THEN the image is stored in `content/campaigns/{slug}/assets/maps/`
- AND a corresponding `.md` file is created in the campaign's `maps/` directory with metadata
- AND the map is viewable as an interactive canvas using Leaflet.js with CRS.Simple (non-geographic)

#### Scenario: Map navigation
- GIVEN a user viewing a map
- WHEN they interact with it
- THEN they can pan (drag), zoom (scroll/pinch), and reset view (double-click or button)
- AND zoom levels are smooth and continuous
- AND the map stays within bounds (no infinite scrolling past edges)

### Requirement: Leaflet Integration

The system SHALL render interactive maps using Leaflet.js with CRS.Simple.

#### Scenario: Rendering a map with CRS.Simple
- GIVEN a map entity with an uploaded image
- WHEN the user navigates to the map view
- THEN Leaflet.js initializes with CRS.Simple (non-geographic pixel coordinates)
- AND the image is displayed as a tile layer bounded to its pixel dimensions

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

