## ADDED Requirements

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
