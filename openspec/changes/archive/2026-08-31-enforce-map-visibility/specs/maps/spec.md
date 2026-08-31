## ADDED Requirements

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
