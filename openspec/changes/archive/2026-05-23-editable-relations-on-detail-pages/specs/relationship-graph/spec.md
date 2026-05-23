## ADDED Requirements

### Requirement: Inline relation management from entity detail pages

The system SHALL support full create / edit / delete management of relations directly from the character, organization, and location detail pages, in addition to the existing tldraw diagram and `/relations/*` page entry points.

#### Scenario: Add via detail panel writes the same relation row as /relations/new

- **GIVEN** an editor on a character detail page
- **WHEN** they add a new ally-relation via the detail-page panel
- **THEN** the resulting `entity_relations` row is functionally identical to a row created via `POST /api/campaigns/:id/relations` from the `/relations/new` page
- **AND** the same forward/reverse labels and attitude semantics apply

#### Scenario: Edit via detail panel updates the same row as /relations/[id]/edit

- **GIVEN** an existing relation
- **WHEN** an editor modifies it through the detail-page panel
- **THEN** the underlying `PUT /api/campaigns/:id/relations/:relationId` endpoint is invoked
- **AND** the resulting row is functionally identical to one edited via the `/relations/[id]/edit` page

#### Scenario: Delete via detail panel removes the row bidirectionally

- **GIVEN** a relation visible on both endpoints' detail pages (source and target)
- **WHEN** the editor deletes it from the source's detail panel
- **THEN** the row is removed from `entity_relations`
- **AND** the relation no longer appears on the target's detail page either
