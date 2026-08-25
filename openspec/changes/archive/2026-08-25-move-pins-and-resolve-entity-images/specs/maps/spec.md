## ADDED Requirements

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
