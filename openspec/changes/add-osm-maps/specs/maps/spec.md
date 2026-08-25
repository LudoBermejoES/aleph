## ADDED Requirements

### Requirement: OpenStreetMap Map Type

The system SHALL support a second map type, `osm`, alongside the existing uploaded-image
type (`image`, the implicit type of every map that predates this requirement). An `osm` map
SHALL be rendered from standard OpenStreetMap-compatible XYZ tiles using Leaflet's default
Web Mercator CRS (`EPSG:3857`), not `CRS.Simple`. The tile source URL SHALL be configurable
by the operator, defaulting to the public OpenStreetMap tile service, and the map SHALL
always display the required "© OpenStreetMap contributors" attribution when that or an
equivalent tile source is used.

#### Scenario: Creating an OSM-type map

- **WHEN** an editor or above creates a map with `type: 'osm'`
- **THEN** the map is stored without requiring an uploaded image
- **AND** no local tile generation is triggered for it

#### Scenario: Rendering an OSM-type map

- **WHEN** a user views a map whose `type` is `osm`
- **THEN** Leaflet initializes with the default CRS (not `CRS.Simple`)
- **AND** the tile layer points at the configured OSM-compatible tile source
- **AND** the map's required attribution is visibly displayed

#### Scenario: An image-type map is unaffected

- **WHEN** a user views a map whose `type` is `image` (including every map created before
  this requirement existed, which implicitly has `type: 'image'`)
- **THEN** it continues to render exactly as described by the "Leaflet Integration"
  requirement's `image` scenarios, with `CRS.Simple` and no external tile source

#### Scenario: Attribution is not required for image maps

- **WHEN** a user views a map whose `type` is `image`
- **THEN** no OpenStreetMap attribution is displayed, since no OSM tiles are involved

### Requirement: Initial View by Address, City, or Coordinates

When creating or editing an `osm`-type map, the system SHALL let an editor or above choose
the map's initial view either by resolving a free-text address or city name through a
server-side geocoding call, or by entering coordinates directly. The chosen center
(`centerLat`, `centerLng`) and zoom (`defaultZoom`) SHALL be stored on the map and used as
its initial view every time it is opened, without requiring the viewer to know or set them.

Geocoding SHALL be performed by the server, never directly from the browser, and SHALL
respect the geocoding provider's usage policy: at most one outbound geocoding request per
second regardless of how many users trigger a search, no automatic request fired for every
keystroke, and prior results for the same normalized query SHALL be served from a server-side
cache rather than re-requested.

#### Scenario: Resolving an address to a center point

- **WHEN** an editor searches for a free-text address or city while creating or editing an
  `osm` map
- **THEN** the server resolves it via a geocoding call and returns one or more candidate
  matches, each with a display name and coordinates
- **AND** the resolved display name and coordinates are shown to the editor before the map is
  saved with that center

#### Scenario: Entering coordinates directly

- **WHEN** an editor provides latitude and longitude directly instead of a text query
- **THEN** no geocoding call is made
- **AND** the map's center is stored as provided, after validating it is within
  `-90..90` latitude and `-180..180` longitude

#### Scenario: Choosing the initial zoom

- **WHEN** an editor sets a zoom level while creating or editing an `osm` map
- **THEN** it is stored as `defaultZoom` and used as the map's initial zoom on every load,
  independent of the map's configured `minZoom`/`maxZoom` bounds

#### Scenario: Geocoding is never triggered per keystroke

- **WHEN** an editor is typing an address or city query
- **THEN** no geocoding request is sent until the editor explicitly submits the search (or,
  at minimum, after a debounce period with no further input), so that no request is sent per
  character typed

#### Scenario: Geocoding request rate is bounded process-wide

- **WHEN** multiple editors across any campaigns trigger address searches concurrently
- **THEN** outbound requests to the geocoding provider SHALL be serialized to no more than
  one per second in aggregate, not one per second per user

#### Scenario: A repeated query is served from cache

- **WHEN** the same normalized address or city text is searched again within the cache's
  validity window
- **THEN** the previously resolved result is returned without a new outbound geocoding
  request

#### Scenario: Geocoding fails or the network is unavailable

- **WHEN** the geocoding provider is unreachable or returns no match
- **THEN** the editor sees a clear error and can still create or edit the map by entering
  coordinates directly, or leave the center/zoom unset for later editing

### Requirement: Drag-and-Drop Pin Placement

The system SHALL let an editor or above create a map pin by dragging an entity from an
in-page entity picker and dropping it onto the map viewer, on both `image`-type and
`osm`-type maps. The picker SHALL be embedded on the map detail page itself — not the
standalone entity list page — because drag-and-drop cannot cross a page navigation. Any
entity type in the campaign SHALL be a valid drag source, since a pin's entity link is
already generic (`mapPins.entityId` references `entities.id` regardless of `entities.type`).

Dropping an entity SHALL create a pin via the same pin-creation contract already used by the
API and CLI (`lat`, `lng`, `entityId`, optional `label`/`icon`/`color`/`groupId`/
`visibility`), computing `lat`/`lng` from the drop location according to the target map's
`type` as described in the "Map Pins (Markers)" requirement — never a second, parallel pin
representation.

#### Scenario: Dragging an entity onto an image-type map

- **WHEN** an editor drags an entity from the picker and drops it on a map whose `type` is
  `image`
- **THEN** a pin is created linked to that entity, at the dropped location converted to the
  map's `CRS.Simple`-derived pixel coordinates
- **AND** the pin appears immediately without a page reload

#### Scenario: Dragging an entity onto an OSM-type map

- **WHEN** an editor drags an entity from the picker and drops it on a map whose `type` is
  `osm`
- **THEN** a pin is created linked to that entity, at the dropped location's real latitude
  and longitude, unmodified
- **AND** the pin appears immediately without a page reload

#### Scenario: A viewer without editor role cannot drag

- **WHEN** a player or visitor views a map
- **THEN** the entity picker either does not offer dragging or any drop attempt is rejected
  by the server with a 403, matching the existing role gate on `POST
/maps/[slug]/pins`

#### Scenario: The dropped entity is filtered from the picker first

- **WHEN** an editor searches or filters the entity picker by name or type
- **THEN** only matching entities are offered as drag sources, mirroring the same
  search/filter pattern already used on the campaign's entity list page

## MODIFIED Requirements

### Requirement: Leaflet Integration

The system SHALL render `image`-type maps using Leaflet.js with `CRS.Simple` and
`L.tileLayer`. The `imageOverlay` fallback SHALL NOT be used for `image`-type maps.
`osm`-type maps SHALL instead use Leaflet's default Web Mercator CRS (`EPSG:3857`), as
described in the "OpenStreetMap Map Type" requirement — `CRS.Simple` SHALL NOT be applied to
an `osm`-type map.

#### Scenario: Rendering a tiled map

- **WHEN** the user navigates to a map view whose `type` is `image`
- **THEN** Leaflet initializes with `CRS.Simple`
- **AND** an `L.tileLayer` is configured with the map's tile URL, calculated maxZoom, 256px
  tile size, noWrap, and bounds matching the image dimensions
- **AND** the map fits to the image bounds on load

#### Scenario: Rendering an OSM map

- **WHEN** the user navigates to a map view whose `type` is `osm`
- **THEN** Leaflet initializes with its default CRS, not `CRS.Simple`
- **AND** the map view is set to the map's stored `centerLat`/`centerLng`/`defaultZoom`
  instead of fitting to a pixel bounds box

#### Scenario: Zoom levels derived from image dimensions

- **WHEN** the MapViewer component receives map width and height for an `image`-type map
- **THEN** it calculates `maxZoom = Math.ceil(Math.log2(Math.max(width, height) / 256))`
- **AND** minZoom is set to 0
- **AND** the `tileLayer` uses these zoom bounds

#### Scenario: Out-of-bounds tiles return transparent PNG

- **WHEN** Leaflet requests a locally-served `image`-type tile at coordinates outside the
  image area
- **THEN** the server returns a 1x1 transparent PNG (not a 404)
- **AND** the response includes `Cache-Control: public, max-age=604800`

### Requirement: Map Pins (Markers)

The system SHALL support placing interactive pins on maps that link to wiki entities. A
pin's `lat`/`lng` columns hold one of two coordinate systems, determined by the `type` of the
map the pin belongs to (`mapPins.mapId → maps.id → maps.type`), never by an implicit
convention: on an `image`-type map they are the pin's position already scaled into the map's
`CRS.Simple` units (as derived today from the image's pixel dimensions); on an `osm`-type map
they are real WGS84 degrees, validated to `-90..90` latitude and `-180..180` longitude. A pin
does not carry its own copy of the map's type.

#### Scenario: Pin rendering on Leaflet map

- GIVEN a map with associated pin records in the database
- WHEN the Leaflet map finishes loading
- THEN all pins are rendered as Leaflet markers, interpreting `lat`/`lng` according to the
  parent map's `type`
- AND each marker displays a tooltip on hover with the pin name

#### Scenario: Creating a pin

- GIVEN a DM editing a map
- WHEN they click a location and create a pin
- THEN they can set: name, icon (from icon library), color, size, and optional link to a
  wiki entity
- AND the pin's position is stored as `lat`/`lng`, in the coordinate system dictated by the
  map's `type` (CRS.Simple-scaled pixels for `image`, WGS84 degrees for `osm`)

#### Scenario: Coordinate validation depends on map type

- **WHEN** a pin is created or updated on an `osm`-type map
- **THEN** the server SHALL reject a `lat`/`lng` outside `-90..90`/`-180..180`
- **AND** this range check SHALL NOT be applied to pins on an `image`-type map, whose pixel
  coordinates routinely exceed those bounds

#### Scenario: Pin interaction

- GIVEN a user viewing a map with pins
- WHEN they hover over a pin
- THEN a tooltip shows the pin name and linked entity preview (image, type, brief
  description)
- AND clicking the pin navigates to the linked entity page
- AND right-clicking shows options: Edit Pin, Go to Entity, Copy Link

#### Scenario: Pin visibility and permissions

- GIVEN pins with different visibility levels (public, members, dm_only, specific_users)
- WHEN a Player views the map
- THEN only pins they have permission to see are rendered
- AND hidden pins leave no trace (no blank space, no "something is here" indicators)

#### Scenario: Pin groups

- GIVEN a map with many pins categorized into groups (e.g., "Cities", "Dungeons", "Points of
  Interest")
- WHEN the user opens the map legend panel
- THEN they can toggle entire groups on/off
- AND each group has a name, color, and icon
- AND the DM can set default visibility per group

### Requirement: Nested Map Hierarchy

The system SHALL support linking maps to create a drill-down hierarchy, independent of each
map's `type`. A map's position in the hierarchy (`parentMapId`, and any pin's `childMapId`)
SHALL NOT be constrained by whether it or its parent/child is an `image`-type or `osm`-type
map — each map resolves and renders its own coordinate system independently when navigated
to.

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

#### Scenario: Mixed-type nesting is supported

- **WHEN** an `image`-type map has a pin whose `childMapId` points to an `osm`-type map (or
  vice versa)
- **THEN** navigating that pin transitions to the child map, which renders using its own
  `type`'s rules
- **AND** no coordinate is shared or translated between the two maps' coordinate systems

### Requirement: Map detail page has a delete action

The map detail page SHALL include a destructive Delete button, gated to `dm` and `co_dm`
roles, that triggers a confirmation dialog and calls `DELETE /api/campaigns/:id/maps/:slug`
on confirmation, then redirects to the map list. The server-side handler already removes
associated tiles and files for an `image`-type map; for an `osm`-type map, which has no
uploaded image or generated tiles, deletion SHALL remove only the database rows (the map and
its pins, layers, and regions, via the existing cascade), with no filesystem cleanup
attempted.

#### Scenario: DM can delete a map from the detail page

- **WHEN** a DM views a map detail page and clicks Delete
- **AND** confirms the dialog
- **THEN** the map and its tiles are deleted
- **AND** the user is redirected to `/campaigns/:id/maps`

#### Scenario: Deleting an OSM-type map

- **WHEN** a DM deletes a map whose `type` is `osm`
- **THEN** its database rows (map, pins, layers, regions) are removed
- **AND** no attempt is made to delete a local image file or tile directory, since none
  exists for that map
