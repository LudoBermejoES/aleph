# location-management Specification

## Purpose
TBD - created by archiving change locations. Update Purpose after archive.
## Requirements
### Requirement: Location CRUD API

The system SHALL expose dedicated API endpoints for managing campaign locations as a specialized view over the `entities` table with `type = 'location'`.

#### Scenario: List locations
- **GIVEN** an authenticated campaign member
- **WHEN** `GET /api/campaigns/:id/locations` is called
- **THEN** the system returns an array of locations visible to the caller's role
- **AND** each item includes: `id, name, slug, subtype, parentId, parentName, childCount, inhabitantCount, visibility, updatedAt`
- **AND** results are sorted by name ascending
- **AND** an optional `parentId` query param filters to direct children of that location
- **AND** an optional `subtype` query param filters by subtype
- **AND** an optional `search` query param filters by name (case-insensitive prefix match)

#### Scenario: Create location
- **GIVEN** an authenticated user with at least editor role
- **WHEN** `POST /api/campaigns/:id/locations` is called with `{ name, subtype, parentId?, visibility?, content? }`
- **THEN** the system creates an `entities` row with `type = 'location'`
- **AND** writes a markdown file at `{contentDir}/location/{slug}.md` with frontmatter including `fields.subtype`
- **AND** returns `{ id, name, slug, subtype, parentId, visibility }`
- **AND** the slug is derived from the name and made unique within the campaign

#### Scenario: Get location detail
- **GIVEN** an authenticated campaign member
- **WHEN** `GET /api/campaigns/:id/locations/:slug` is called
- **THEN** the system returns the location entity with: `id, name, slug, subtype, parentId, parentName, visibility, content, frontmatter, updatedAt`
- **AND** returns 404 if the slug does not exist
- **AND** returns 403 if the caller's role does not meet the location's visibility requirement

#### Scenario: Update location
- **GIVEN** an authenticated user with at least editor role
- **WHEN** `PUT /api/campaigns/:id/locations/:slug` is called with updated fields
- **THEN** the system updates the `entities` row and rewrites the markdown file
- **AND** returns the updated location

#### Scenario: Delete location
- **GIVEN** an authenticated user with at least dm or co_dm role
- **WHEN** `DELETE /api/campaigns/:id/locations/:slug` is called
- **THEN** the system deletes the `entities` row (cascading to relations and permissions)
- **AND** deletes the markdown file from disk
- **AND** returns 204 No Content

### Requirement: Location hierarchy (sub-locations)

The system SHALL support infinite hierarchical nesting of locations using the `entities.parentId` foreign key.

#### Scenario: Sub-locations endpoint
- **GIVEN** a location with slug `barovia-region`
- **WHEN** `GET /api/campaigns/:id/locations/barovia-region/sub-locations` is called
- **THEN** the system returns all direct child locations (where `parentId = barovia-region entity id`)
- **AND** each item includes `id, name, slug, subtype, childCount, inhabitantCount`

#### Scenario: Hierarchy breadcrumb
- **GIVEN** a deeply nested location (Room > Building > City > Region)
- **WHEN** `GET /api/campaigns/:id/locations/:slug` is called
- **THEN** the response includes an `ancestors` array with `[{ name, slug }]` from root to immediate parent

#### Scenario: Parent constraint
- **GIVEN** a create or update request with a `parentId`
- **WHEN** the `parentId` does not belong to a location entity in the same campaign
- **THEN** the system returns 400 Bad Request

### Requirement: Location inhabitants

The system SHALL expose inhabitants of a location — characters and organizations linked to it.

#### Scenario: Primary inhabitants (character current location)
- **GIVEN** a location with entity id `X`
- **WHEN** `GET /api/campaigns/:id/locations/:slug/inhabitants` is called
- **THEN** the system returns characters where `characters.locationEntityId = X`
- **AND** each item includes `id, name, slug, characterType, status`

#### Scenario: Relation-linked characters
- **GIVEN** a character linked to a location via an `entity_relations` row with `relationType = 'located_in'`
- **WHEN** `GET /api/campaigns/:id/locations/:slug/inhabitants` is called
- **THEN** that character is also included in the response (deduplicated if already primary)
- **AND** each item includes a `source` field indicating `'primary'` or `'relation'`

#### Scenario: Organizations at a location
- **WHEN** `GET /api/campaigns/:id/locations/:slug/organizations` is called
- **THEN** the system returns organizations linked via `entity_relations` with `relationType = 'located_in'`
- **AND** each item includes `id, name, slug, type, memberCount`

#### Scenario: Link character to location via relation
- **GIVEN** an editor+
- **WHEN** `POST /api/campaigns/:id/locations/:slug/inhabitants` is called with `{ characterId, note? }`
- **THEN** an `entity_relations` row is created with `relationType = 'located_in'`
- **AND** `forwardLabel = 'located in'`, `reverseLabel = 'inhabited by'`

#### Scenario: Unlink character from location
- **WHEN** `DELETE /api/campaigns/:id/locations/:slug/inhabitants/:characterId` is called
- **THEN** the `entity_relations` row is removed

#### Scenario: Link organization to location
- **WHEN** `POST /api/campaigns/:id/locations/:slug/organizations` is called with `{ organizationId }`
- **THEN** an `entity_relations` row is created linking the org entity to the location

#### Scenario: Unlink organization from location
- **WHEN** `DELETE /api/campaigns/:id/locations/:slug/organizations/:organizationId` is called
- **THEN** the `entity_relations` row is removed

### Requirement: Location subtypes

The system SHALL support built-in location subtypes stored in `fields.subtype` in the markdown frontmatter.

#### Scenario: Valid subtypes
- **GIVEN** a location being created or updated
- **WHEN** the `subtype` field is provided
- **THEN** it SHALL be one of: `country, region, city, town, village, dungeon, lair, building, room, wilderness, other`
- **AND** if omitted it defaults to `other`

#### Scenario: Subtype displayed in list and detail
- **WHEN** a location is listed or viewed
- **THEN** the subtype is returned and displayed as a badge in the UI

### Requirement: Location UI pages

The system SHALL provide dedicated UI pages for managing locations within a campaign.

#### Scenario: Location list page
- **GIVEN** a campaign member navigates to `/campaigns/:id/locations`
- **THEN** all visible locations are listed with name, subtype badge, parent breadcrumb, and inhabitant count
- **AND** there is a "New Location" button (visible to editors+)
- **AND** there is a search field to filter by name

#### Scenario: Location detail page
- **GIVEN** a user navigates to `/campaigns/:id/locations/:slug`
- **THEN** the page displays: location name, subtype, description (rendered Markdown), ancestors breadcrumb
- **AND** a Sub-locations panel listing direct children
- **AND** an Inhabitants panel listing primary and relation-linked characters
- **AND** an Organizations panel listing linked organizations
- **AND** Edit and Delete buttons (visible to editors+/co_dm+ respectively)

#### Scenario: Location create/edit pages
- **GIVEN** an editor+ navigates to `/campaigns/:id/locations/new` or `/campaigns/:id/locations/:slug/edit`
- **THEN** a form is shown with: Name (required), Subtype (select), Parent Location (optional select), Visibility (select), Description (MarkdownEditor)
- **AND** the form saves via the API and redirects to the detail page on success

### Requirement: Map pin integration on location detail

The system SHALL display map pins that reference a location entity on the location's detail page.

#### Scenario: Linked map pins shown
- **GIVEN** one or more map pins with `entityId` pointing to a location
- **WHEN** the location detail page is viewed
- **THEN** a "Maps" panel lists the map(s) and pin label(s) with a link to the corresponding map view

