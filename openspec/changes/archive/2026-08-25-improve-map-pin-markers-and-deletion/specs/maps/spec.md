## ADDED Requirements

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
