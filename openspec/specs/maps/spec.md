# maps Specification

## Purpose

Interactive campaign maps: uploaded images tiled into 256x256 PNG tiles across zoom levels and rendered with Leaflet using `CRS.Simple` and `L.tileLayer` (never `imageOverlay`), entity-linked pins, transparent overlay layers, nested map drill-down hierarchies, drawn regions and paths, calibrated scale and distance measurement, a task to re-tile existing maps, and a role-gated delete action on the map detail page.

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

### Requirement: A Pin's Custom Label SHALL Override the Linked Entity's Live Name

When a pin's `label` is a deliberately-set, non-null value, it SHALL take priority over the linked
entity's current name when the pin's display name is resolved. When `label` is null, the linked
entity's current name SHALL be used. When neither is available, a placeholder SHALL be used.

A label SHALL only be considered "deliberately set" if it was written through an explicit rename
(this change) or survives the one-off migration described below — pin creation SHALL NOT itself write
a copy of the entity's name into `label`.

#### Scenario: A renamed pin keeps its name after the entity is renamed again

- **WHEN** a pin has a non-null `label` set by an explicit rename
- **AND** the linked entity is renamed afterward
- **THEN** the pin continues to display its own `label`, not the entity's new name

#### Scenario: An un-renamed pin follows its entity

- **WHEN** a pin's `label` is null
- **AND** its linked entity is renamed
- **THEN** the pin's displayed name updates to the entity's new name without any write to the pin

#### Scenario: A pin with no linked entity

- **WHEN** a pin has no `entityId`
- **THEN** its `label` (or the placeholder, if also null) is displayed, since there is no entity name
  to fall back to

### Requirement: Pin Creation SHALL NOT Copy the Linked Entity's Name Into `label`

Creating a pin (via the UI's drag-and-drop or the CLI's `pin-add`) SHALL leave `label` null unless the
caller explicitly supplies one. `pin-add`'s `--label` SHALL be optional.

#### Scenario: Dropping an entity onto the map

- **WHEN** an editor drags an entity from the entity picker and drops it on the map
- **THEN** the created pin's `label` is null
- **AND** its displayed name is the entity's current name, resolved live

#### Scenario: `pin-add` without `--label`

- **WHEN** `pin-add` is invoked without `--label`
- **THEN** the request succeeds and the created pin's `label` is null

### Requirement: A Pin's Label SHALL Be Editable Through the Existing Move Endpoint

`PATCH .../pins/[pinId]` SHALL accept an optional `label` field in addition to its existing optional
`lat`/`lng` pair, gated to editor role or above like the rest of that endpoint. At least one of
`{lat, lng}` (given together) or `label` SHALL be present in the request body, or the request SHALL be
rejected. `color` and `entityId` sent in the same body SHALL continue to be silently ignored, as
before this change.

Sending an empty (or all-whitespace) `label` SHALL clear it to `null`, not store an empty string —
clearing a pin's custom name SHALL mean "resolve its display name from the linked entity again".

The endpoint SHALL continue to return the updated pin in the same shape the pin-listing endpoint
returns.

#### Scenario: Renaming alongside a move

- **WHEN** an editor PATCHes a pin with `{ lat, lng, label }`
- **THEN** both the coordinates and the label are persisted

#### Scenario: Renaming without moving

- **WHEN** an editor PATCHes a pin with only `{ label }`
- **THEN** the label is persisted and the pin's coordinates are unchanged

#### Scenario: Moving without renaming

- **WHEN** an editor PATCHes a pin with only `{ lat, lng }`
- **THEN** the coordinates are persisted and any existing label is unchanged

#### Scenario: Color and entity are still not accepted

- **WHEN** a PATCH body includes `color` or `entityId` alongside a valid `label` or coordinate pair
- **THEN** the pin's colour and linked entity are unchanged

#### Scenario: Clearing a label

- **WHEN** an editor PATCHes a pin with `{ label: '' }`
- **THEN** the pin's stored `label` becomes `null`
- **AND** its displayed name is now resolved from its linked entity, if any

#### Scenario: An empty request body

- **WHEN** a PATCH body carries none of `lat`, `lng`, or `label`
- **THEN** the request is rejected rather than silently doing nothing

#### Scenario: A viewer below editor

- **WHEN** a user without editor permission requests a label change
- **THEN** the request is refused

### Requirement: Existing Pins Whose Label Merely Duplicates Their Entity's Name SHALL Be Migrated

On startup, a one-off, idempotent backfill SHALL null any `mapPins.label` that equals (trimmed,
case-insensitively) its linked entity's current name, so that pins whose label is indistinguishable
from a stale copy correctly resume following the live entity name rather than being treated as
deliberately renamed. Pins with no linked entity, and pins whose label differs from their entity's
current name, SHALL be left unchanged.

#### Scenario: A label that matches its entity's name

- **WHEN** the backfill runs
- **AND** a pin's `label` equals its linked entity's current name, ignoring case and surrounding
  whitespace
- **THEN** the pin's `label` is set to `null`

#### Scenario: A label that differs from its entity's name

- **WHEN** the backfill runs
- **AND** a pin's `label` does not equal its linked entity's current name
- **THEN** the pin's `label` is left unchanged

#### Scenario: A pin with no linked entity

- **WHEN** the backfill runs
- **AND** a pin has no `entityId`
- **THEN** the pin's `label` is left unchanged

#### Scenario: Running it twice

- **WHEN** the backfill runs a second time after the first
- **THEN** it makes no further changes

### Requirement: Renaming a Pin SHALL Have a CLI Command and a UI Affordance

The CLI SHALL expose a command that renames a pin via the same endpoint, so every pin operation
reachable from the UI is also reachable without a browser. The pins list under a map SHALL offer an
edit affordance next to its existing delete affordance, visible under the same editor-or-above gate,
and renaming SHALL NOT rebuild the map or close an open popup.

#### Scenario: CLI rename

- **WHEN** `map pin-rename --pin <id> --label <label>` is run by an editor or above
- **THEN** the pin's label is updated via the PATCH endpoint and the result is printed

#### Scenario: CLI clear

- **WHEN** `map pin-rename --pin <id> --label ""` is run
- **THEN** the pin's label is cleared and its display name reverts to the linked entity's name

#### Scenario: Editing from the pins list

- **WHEN** an editor or above clicks the edit affordance next to a pin in the pins list and confirms a
  new name
- **THEN** the pin's label is updated
- **AND** the map is not rebuilt (no marker flicker, no popup closed)
- **AND** a viewer below editor sees no edit affordance

### Requirement: A pin's popup SHALL show its linked entity's image and a short text excerpt

A pin whose linked entity has an image SHALL show that image in its popup, not only on the marker.
A pin whose linked entity has readable text (a `location` or `character`'s markdown, or an
`organization`'s description) SHALL show a short, plain-text excerpt of it in the popup. A pin with
no linked entity, or one of a type this requirement does not cover, SHALL show neither.

The popup SHALL have a maximum width, so an image-plus-text card does not grow wider than a small
screen.

#### Scenario: A location pin with an image and public text

- **WHEN** a pin is linked to a location that has an image and a markdown page with no secret
  content
- **THEN** its popup shows the location's image and a short excerpt of its text, in addition to the
  existing name, "Ver entidad" link, and delete affordance

#### Scenario: A character pin

- **WHEN** a pin is linked to a character
- **THEN** its popup shows the character's portrait (if any) and a short excerpt of the character's
  markdown text, using the same rules as a location

#### Scenario: An organization pin

- **WHEN** a pin is linked to an organization
- **THEN** its popup shows the organization's image (if any) and a short excerpt of its
  `description` field

#### Scenario: An entity type with no established text source

- **WHEN** a pin is linked to an entity type other than location, character, or organization
- **THEN** the popup shows no excerpt (no image/type/id fields already established are affected)

#### Scenario: A pin with no linked entity

- **WHEN** a pin has no `entityId`
- **THEN** the popup shows no image and no excerpt, exactly as before this change

### Requirement: The excerpt SHALL NEVER include secret content, and stripping SHALL happen before excerpting

A `location` or `character`'s excerpt SHALL be built from its markdown text only AFTER the same
secret-block stripping rule (`stripSecretBlocks`, gated on the viewer's campaign role) that entity's
own page already applies to it. The excerpt SHALL NOT be built from the raw file content and then
have secrets removed afterward, and it SHALL NOT be able to include any text originating inside a
`:::secret{...}` block the viewer's role does not clear.

An `organization`'s excerpt is built from its `description` column, which has no secret-block
convention; it is not passed through `stripSecretBlocks`. It SHALL still be withheld entirely (along
with the entity's image and type, per the existing visibility join) from a viewer who cannot see
that organization at all.

#### Scenario: A location's first paragraph is secret

- **WHEN** a location's markdown opens with a `:::secret{.dm}` block followed by public text, and
  the viewer's role is below the block's required role
- **THEN** the popup excerpt contains none of the secret block's text
- **AND** it contains the public text that follows it, if it fits within the excerpt length

#### Scenario: A DM-or-above viewer sees the same location

- **WHEN** the same location is viewed by a `dm` or `co_dm` role
- **THEN** the excerpt may include text from the secret block, per the same rule that already
  governs that role reading the location's full page

#### Scenario: An organization the viewer cannot see

- **WHEN** a pin links to an organization whose visibility excludes the current viewer
- **THEN** the popup shows no excerpt for it, exactly as it already shows no image or type

### Requirement: A missing or unreadable entity file SHALL NOT fail the pins request

If a `location` or `character` entity's markdown file cannot be read (missing from disk, permission
error, or any other read failure), that one pin's `entityExcerpt` SHALL be `null`. Every other pin on
the same map SHALL still return normally, including their own excerpts.

#### Scenario: One entity's file is missing

- **WHEN** a map has several pins and one linked entity's markdown file does not exist on disk
- **THEN** the pins request still succeeds
- **AND** every pin except the one with the missing file has its normal fields (including excerpt,
  where applicable)
- **AND** the pin with the missing file has `entityExcerpt: null`

### Requirement: Every field interpolated into the popup HTML SHALL be escaped

The image URL and the excerpt text, like every other field this popup already interpolates, SHALL be
HTML-escaped before being placed into the popup's HTML string.

#### Scenario: An excerpt containing HTML-significant characters

- **WHEN** an entity's text, once flattened to plain text, still contains characters like `<`, `>`,
  `&`, or `"`
- **THEN** the popup HTML contains their escaped form, not the raw characters

### Requirement: Creating or deleting a pin SHALL NOT rebuild the map

Adding or removing a pin SHALL update the rendered markers in place. The Leaflet instance SHALL NOT
be unmounted, and the map's centre and zoom SHALL be exactly what they were before the operation.

A full page data reload is not an acceptable implementation even if the viewport is saved and
restored, because the map is still destroyed and rebuilt.

#### Scenario: An entity is dropped on a zoomed-in map

- **WHEN** a user has panned and zoomed to a street, then drags an entity onto the map
- **THEN** the pin is saved and its marker appears at the drop point
- **AND** the map's centre and zoom are unchanged
- **AND** several entities can be dropped in a row without re-finding the location

#### Scenario: A pin is deleted

- **WHEN** a user deletes a pin
- **THEN** that marker disappears and every other marker stays
- **AND** the map's centre and zoom are unchanged

### Requirement: A pin SHALL be marked by its linked entity's image

A pin whose linked entity has an image SHALL render that image as its marker, in a circular frame,
cropped to fill rather than distorted. A pin whose entity has no image SHALL render an icon chosen
by that entity's type. A pin with no linked entity SHALL keep the plain coloured marker.

The data the marker needs SHALL be delivered with the pins themselves, so a marker is correct on
first paint without a second request per pin.

#### Scenario: Entities with images

- **WHEN** a map holds pins linked to entities that have portraits
- **THEN** each marker shows its own entity's portrait, circular and uncropped in aspect
- **AND** two pins linked to different entities are visually distinguishable

#### Scenario: An entity with no image

- **WHEN** a pin's linked entity has no image
- **THEN** the marker shows an icon determined by the entity's type
- **AND** two entities of different types show different icons

#### Scenario: A pin with no entity

- **WHEN** a pin has no linked entity
- **THEN** it renders as a plain coloured marker

#### Scenario: Entity data is not leaked by the join

- **WHEN** the pins are fetched by a viewer who may not see a linked entity
- **THEN** the pin is still returned
- **AND** it carries no image or type for that entity

### Requirement: A pin SHALL be deletable from the interface

A user with editor permission or above SHALL be able to delete a pin without leaving the map page
and without using the CLI. The action SHALL be reachable both from the pin's own marker and from the
list of pins on the map page, and SHALL ask for confirmation before deleting.

The server SHALL remain the authority on permission; the interface gate is a convenience.

#### Scenario: Deleting from the marker

- **WHEN** an editor opens a pin's marker and chooses to delete it
- **THEN** they are asked to confirm
- **AND** on confirming, the pin is deleted and its marker removed

#### Scenario: Deleting from the pins list

- **WHEN** an editor deletes a pin from the list beneath the map
- **THEN** the pin is deleted and its marker removed from the map

#### Scenario: A viewer without permission

- **WHEN** a user below editor views the map
- **THEN** no delete action is offered

### Requirement: A pin SHALL be movable by dragging it

A user with editor permission or above SHALL be able to reposition a pin by dragging its marker, on
both `image` and `osm` maps, and the new position SHALL be persisted. A user below editor SHALL find
the marker immovable.

Moving a pin SHALL NOT rebuild the map: the Leaflet instance SHALL NOT be unmounted and the centre
and zoom SHALL be unchanged, the same rule that governs creating and deleting a pin.

If the server rejects the move, the marker SHALL return to its previous position, so the screen never
shows a position the database does not hold.

#### Scenario: An editor drags a pin

- **WHEN** an editor drags a pin's marker to a new place and releases it
- **THEN** the new coordinates are persisted
- **AND** the map's centre and zoom are unchanged
- **AND** reloading the page shows the pin at the new place

#### Scenario: The same drag on an image map

- **WHEN** the map is an `image` map rather than an `osm` map
- **THEN** dragging stores coordinates in that map's own coordinate space, using the same conversion
  the drop path uses

#### Scenario: The server rejects the move

- **WHEN** the request to move a pin fails
- **THEN** the marker returns to the position it had before the drag

#### Scenario: A viewer below editor

- **WHEN** a user without editor permission views the map
- **THEN** the pin markers cannot be dragged

#### Scenario: A drag that does not move

- **WHEN** a drag ends at the position it started from
- **THEN** no move request is sent

### Requirement: Moving a pin SHALL have an endpoint and a CLI command

The system SHALL expose an endpoint that updates only a pin's coordinates, permitted to editor and
above, validating coordinates by the same rule that governs pin creation, and returning the updated
pin in the same shape the pin-listing endpoint returns.

The CLI SHALL expose a matching command, so that every pin operation reachable from the interface is
also reachable without a browser.

#### Scenario: Only coordinates are accepted

- **WHEN** a request to move a pin also carries a label, colour or linked entity
- **THEN** those fields are not applied

#### Scenario: Permission

- **WHEN** a user below editor requests a pin move
- **THEN** the request is refused

#### Scenario: The response shape

- **WHEN** a pin is moved successfully
- **THEN** the returned pin has the same field shape as a pin from the listing endpoint

### Requirement: A pin marker SHALL show the entity's main image wherever that image is stored

The image a marker displays SHALL be resolved across every place an entity's main image can live, in
a declared priority order, so that a character shows its portrait, an organization its image, and a
location its main gallery image or its stored image. The resolution SHALL happen server-side and
arrive with the pins, without one request per pin.

An entity with no image in any source SHALL fall back to its type icon, and a pin with no linked
entity to the plain coloured marker.

A marker SHALL NOT render as blank when an image fails to load; the type icon or coloured background
SHALL remain visible beneath it.

#### Scenario: A character pin

- **WHEN** a pin links to a character that has a portrait
- **THEN** the marker shows that portrait

#### Scenario: An organization pin

- **WHEN** a pin links to an organization that has an image
- **THEN** the marker shows that image

#### Scenario: A location pin

- **WHEN** a pin links to a location that has a main gallery image or a stored image
- **THEN** the marker shows it

#### Scenario: An entity with a gallery and a stored image

- **WHEN** an entity has both a primary gallery image and a stored image URL
- **THEN** the primary gallery image is used

#### Scenario: The join does not multiply pins

- **WHEN** a pin's entity has several gallery images
- **THEN** that pin appears exactly once in the returned list

#### Scenario: An entity with no image anywhere

- **WHEN** a pin links to an entity with no image in any source
- **THEN** the marker shows the icon for that entity's type

#### Scenario: An image that fails to load

- **WHEN** the resolved image URL cannot be fetched by the viewer
- **THEN** the marker remains visible rather than rendering as an empty shape

#### Scenario: Visibility is still respected

- **WHEN** the viewer may not see a pin's linked entity
- **THEN** the pin is returned with no image and no type

### Requirement: El visor de mapas SHALL ofrecer un control para verlo a ventana completa

El visor de mapas SHALL incluir un control que hace que el mapa ocupe la ventana entera, y que
lo devuelve al hueco que le da la página.

El control SHALL estar visible en los dos estados, y en particular en el estado reducido, que
es el único con el que se abre un mapa: un control que solo apareciera con el mapa ya expandido
sería inalcanzable.

El control SHALL decir en qué estado está -- su rótulo nombra la acción disponible y su
`aria-pressed` refleja el estado -- SHALL ser un botón alcanzable con el tabulador y accionable
con el teclado, y SHALL tener foco visible.

El mapa SHALL abrirse siempre reducido. El estado no se recuerda entre visitas.

#### Scenario: El control está ahí desde el principio

- **WHEN** un usuario abre la página de detalle de un mapa
- **THEN** el visor muestra el control de ventana completa
- **AND** el mapa se muestra reducido, con la altura que le da la página

#### Scenario: Expandir

- **WHEN** el usuario acciona el control
- **THEN** el mapa pasa a ocupar la ventana entera
- **AND** el control pasa a ofrecer la acción de reducirlo

#### Scenario: Reducir con el mismo control

- **WHEN** el usuario acciona el control con el mapa ya expandido
- **THEN** el mapa vuelve exactamente al tamaño que tenía antes de expandirse

#### Scenario: Solo con el teclado

- **WHEN** el usuario lleva el foco al control con el tabulador y pulsa Intro
- **THEN** el mapa se expande igual que al pulsarlo con el ratón

### Requirement: Escape SHALL salir del modo de ventana completa

Con el mapa expandido, pulsar `Escape` SHALL reducirlo, además del botón.

Con el mapa reducido, `Escape` NO SHALL ser consumido por el visor: no hay nada de lo que
salir, y el evento debe seguir llegando a quien sí lo espera -- un diálogo abierto encima del
mapa.

#### Scenario: Salir con Escape

- **WHEN** el usuario pulsa `Escape` con el mapa ocupando la ventana
- **THEN** el mapa vuelve al tamaño que tenía

#### Scenario: Escape con el mapa reducido

- **WHEN** el usuario pulsa `Escape` con el mapa ya reducido
- **THEN** el visor no hace nada y no consume la pulsación

### Requirement: El mapa SHALL avisar a Leaflet de cada cambio de tamaño de su contenedor

Cada transición entre reducido y expandido -- en los DOS sentidos, y sea disparada por el
botón o por `Escape` -- SHALL notificar a Leaflet que su contenedor ha cambiado de tamaño
(`invalidateSize()`), después de que el nuevo tamaño esté aplicado en el DOM.

Una no-transición (pedir reducir un mapa ya reducido, o expandir uno ya expandido) NO SHALL
notificar nada: el contenedor no ha cambiado de tamaño.

Esta es la regla cuyo incumplimiento es MUDO. Leaflet guarda el tamaño de su contenedor en
caché y traduce coordenadas a píxeles con ese valor: sin el aviso no hay ningún error, el mapa
simplemente pinta bandas grises y coloca los pines lejos de donde el puntero dice que están.

#### Scenario: Un pin no se mueve de su sitio al expandir

- **GIVEN** un mapa con un pin colocado exactamente en el centro que ese mapa declara, cuyo
  marcador se pinta por tanto en el centro del contenedor
- **WHEN** el usuario expande el mapa a ventana completa
- **THEN** el marcador sigue pintándose en el centro del contenedor, ahora más grande

#### Scenario: Ni al volver

- **WHEN** el usuario reduce el mapa, con el botón o con `Escape`
- **THEN** el marcador vuelve a pintarse en el centro del contenedor reducido

#### Scenario: Los dos tipos de mapa

- **WHEN** el mapa es de tipo `image` (CRS.Simple, coordenadas en píxeles) o de tipo `osm`
  (WGS84)
- **THEN** el control y la ausencia de desplazamiento se comportan igual en los dos

### Requirement: La vista SHALL sobrevivir a las dos transiciones

El centro y el nivel de zoom que el mapa tiene al expandirse SHALL ser los que tiene expandido,
y SHALL ser los que recupera al volver. Expandir el mapa no SHALL llevar al usuario a otro
sitio ni a otra escala.

La reposición de la vista SHALL ocurrir después de notificar el cambio de tamaño, nunca antes:
reponerla sobre un encuadre viejo la deja mal.

#### Scenario: Se expande donde se estaba mirando

- **GIVEN** un usuario que ha desplazado y acercado el mapa hasta una zona concreta
- **WHEN** expande el mapa a ventana completa
- **THEN** sigue viendo la misma zona, a la misma escala, con más superficie alrededor

#### Scenario: Y se vuelve al mismo sitio

- **WHEN** reduce el mapa
- **THEN** vuelve a ver la zona en la que estaba

### Requirement: A map's visibility SHALL be enforced on every read surface

Every route that reads a map or anything belonging to a map SHALL authorise the viewer against the
map's own `visibility`, using the campaign's existing visibility levels and role comparison. No map
read SHALL be reachable without that check.

The check SHALL be applied at a single shared point through which every route obtains its map, so that
a route added later cannot omit it by default.

#### Scenario: The listing

- **WHEN** a viewer lists the campaign's maps
- **THEN** maps whose visibility is above their role are absent from the result
- **AND** nothing indicates how many were withheld

#### Scenario: A map the viewer may not see

- **WHEN** a viewer requests a map whose visibility is above their role
- **THEN** the response is the same as for a map that does not exist

#### Scenario: A map the viewer may see

- **WHEN** a viewer requests a map at or below their role's level
- **THEN** it is returned as before

#### Scenario: A new read route

- **WHEN** a new route that reads a map is added
- **THEN** it obtains the map through the shared authorising lookup rather than querying it directly

### Requirement: A map's sub-resources SHALL authorise the parent map

The pins, layers, regions, image and tiles of a map SHALL be refused to a viewer who may not see that
map, whatever their own visibility says. Addressing a sub-resource directly SHALL NOT be a route into a
map the viewer cannot open.

#### Scenario: Tiles of a hidden map

- **WHEN** a viewer requests a tile of a map they may not see
- **THEN** it is refused as though the map did not exist
- **AND** no imagery is served

#### Scenario: Pins, layers and regions of a hidden map

- **WHEN** a viewer requests the pins, layers or regions of a map they may not see
- **THEN** each is refused as though the map did not exist

#### Scenario: A visible map containing hidden pins

- **WHEN** a viewer may see a map that contains pins above their role
- **THEN** the map is returned and those individual pins remain hidden

### Requirement: Enforcement SHALL NOT change what a permitted viewer can reach

Introducing the check SHALL leave every currently-permitted read permitted. The change SHALL be
verified against the real data of every campaign before it ships, and any map that will become hidden
to viewers who can see it today SHALL be reported.

#### Scenario: The owner's own access

- **WHEN** the campaign's owner or a dm-level role reads any map, its pins, layers, regions, image or
  tiles
- **THEN** everything is returned exactly as before the change

#### Scenario: A map that will change hands

- **WHEN** an existing map's visibility is above some current viewers' role
- **THEN** that map is reported before the change ships, rather than silently disappearing for them

### Requirement: An entity's detail page SHALL show where it is pinned on a map

The detail page of a location, an organization and a character SHALL show the map placements of that
entity, naming the map each one is on. An entity with no placements SHALL show nothing — no empty
section and no residual loading state.

Placements SHALL be a list: an entity may be pinned on more than one map, and more than once on the
same map, and every placement SHALL be shown.

#### Scenario: A location that is on the map

- **WHEN** a user opens the detail page of a location that has a pin
- **THEN** the page shows that placement, naming the map it is on

#### Scenario: A character and an organization

- **WHEN** the entity is a character or an organization rather than a location
- **THEN** its placements are shown the same way

#### Scenario: Several placements

- **WHEN** an entity is pinned on two maps, or twice on one map
- **THEN** every placement is listed, each identifying its map

#### Scenario: No placement

- **WHEN** an entity has no pin anywhere
- **THEN** the page shows no placement section at all

### Requirement: A placement SHALL open the map focused on that pin

Following a placement SHALL open its map and centre, zoom and open the popup of that specific pin,
using the same focus behaviour the map's own pin list already provides.

The pin SHALL be addressable in the map's URL, so a placement is a shareable link rather than an
in-page action.

#### Scenario: Following a placement

- **WHEN** a user follows a placement from an entity's page
- **THEN** the map opens centred and zoomed on that pin with its popup open

#### Scenario: The address is shared

- **WHEN** a map URL identifying a pin is opened directly
- **THEN** the map opens focused on that pin

#### Scenario: The focus is requested before the markers exist

- **WHEN** the map is still loading its markers at the moment the focus is requested
- **THEN** the pin is still focused once the markers exist, rather than the request being silently lost

#### Scenario: The pin no longer exists

- **WHEN** the URL identifies a pin that has been deleted or is not on that map
- **THEN** the map opens normally, with no error

### Requirement: A placement on a map the viewer may not see SHALL NOT be revealed

Placements SHALL be filtered server-side by the viewer's access to the MAP, using the same rule that
governs which maps they may list. A placement they cannot reach SHALL be omitted entirely, not
returned with its identifying fields blanked.

#### Scenario: A hidden map

- **WHEN** an entity is pinned on a map the viewer may not see
- **THEN** that placement does not appear on the entity's page
- **AND** nothing on the page indicates that such a map or placement exists

#### Scenario: A visible and a hidden map

- **WHEN** an entity is pinned on one map the viewer may see and one they may not
- **THEN** only the visible placement is shown
