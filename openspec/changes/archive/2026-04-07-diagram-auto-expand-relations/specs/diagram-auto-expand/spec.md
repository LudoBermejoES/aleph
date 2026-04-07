## ADDED Requirements

### Requirement: Faction-web generator includes member characters

When generating a faction-web diagram, the system SHALL create npcToken shapes for each organization's member characters, positioned in a sub-cluster around the organization's factionCard shape, with arrow bindings connecting them.

#### Scenario: Organization with 3 members

- **WHEN** a faction-web diagram is generated for a campaign where "La Fuerza Oculta" has 3 member characters
- **THEN** the snapshot contains 1 factionCard for "La Fuerza Oculta" and 3 npcToken shapes for the members
- **AND** 3 arrow bindings connect the org shape to each member shape

#### Scenario: Organization with no members

- **WHEN** a faction-web diagram is generated and an organization has no members
- **THEN** only the factionCard shape is created for that org (no extra shapes)

#### Scenario: Member cap at 10 per org

- **WHEN** an organization has 15 members
- **THEN** only 10 npcToken shapes are created for that org's members

---

### Requirement: Faction-web generator includes linked locations

When generating a faction-web diagram, the system SHALL create locationPin shapes for each organization's linked locations, positioned in the sub-cluster around the org.

#### Scenario: Organization with 2 locations

- **WHEN** a faction-web diagram is generated and "La Familia" has 2 linked locations
- **THEN** the snapshot contains 2 locationPin shapes positioned around the org
- **AND** arrow bindings connect the org to each location

#### Scenario: Organization with no locations

- **WHEN** an organization has no linked locations
- **THEN** no locationPin shapes are created for that org

---

### Requirement: Faction-web sub-cluster layout

Member and location shapes SHALL be positioned in a radial sub-cluster around their parent organization, at a smaller radius than the main org layout.

#### Scenario: 4 related entities around an org

- **WHEN** an organization has 3 members and 1 location (4 related entities)
- **THEN** the 4 shapes are evenly spaced in a circle (~150px radius) around the org's position

#### Scenario: 1 related entity

- **WHEN** an organization has only 1 member
- **THEN** the member shape is placed to the right of the org shape

---

### Requirement: Entity-graph generator includes org membership arrows

When generating an entity-graph diagram, the system SHALL create arrow bindings for organization membership relationships in addition to entity relations.

#### Scenario: Character is member of org on diagram

- **WHEN** an entity-graph is generated and character "Diana" (with a shape) is a member of "La Fuerza Oculta" (with a shape)
- **THEN** an arrow binding connects the org shape to Diana's shape

#### Scenario: Org not in entities table

- **WHEN** an entity-graph is generated and a character's organization exists only in the organizations table (not as an entity)
- **THEN** a factionCard shape is created for that organization
- **AND** an arrow binding connects it to the member character

---

### Requirement: Entity-graph generator includes character-location arrows

When generating an entity-graph diagram, the system SHALL create arrow bindings for character→location relationships based on `characters.locationEntityId`.

#### Scenario: Character has location on diagram

- **WHEN** an entity-graph is generated and character "Hotman" has locationEntityId pointing to location "abc" (both have shapes)
- **THEN** an arrow binding connects Hotman's shape to the location shape

---

### Requirement: Entity-graph generator includes org-location arrows

When generating an entity-graph diagram, the system SHALL create arrow bindings for organization→location relationships from the `organizationLocations` table.

#### Scenario: Org linked to location on diagram

- **WHEN** an entity-graph is generated and org "La Fuerza Oculta" is linked to location "Sede Central" (both have shapes)
- **THEN** an arrow binding connects the org shape to the location shape

---

### Requirement: Entity-graph expansion cap

The entity-graph generator SHALL cap the total number of expanded shapes (org factionCards created for membership) at 50 to prevent overwhelming diagrams.

#### Scenario: Many orgs referenced

- **WHEN** characters reference 60 different organizations
- **THEN** only the first 50 organization factionCard shapes are created
