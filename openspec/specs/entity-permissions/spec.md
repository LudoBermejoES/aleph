# entity-permissions Specification

## Purpose

Closes the visibility gap on single-record GET endpoints by resolving entity, character and location fetches through `canUserAccessEntity`, backed by the existing LRU permission cache to avoid redundant queries. List endpoints keep using `buildVisibilityFilter`, which is already correct and stays unchanged.

## Requirements

### Requirement: Entity GET endpoints enforce visibility rules

The system SHALL check entity visibility before returning entity data on single-entity GET endpoints. The existing `canUserAccessEntity` function SHALL be called with the requesting user's context and the entity's visibility setting. Entities the user cannot view SHALL return HTTP 404 (not 403, to avoid leaking existence).

#### Scenario: DM can view any entity regardless of visibility

- **GIVEN** a campaign with an entity whose visibility is `dm_only`
- **WHEN** the DM sends `GET /api/campaigns/:id/entities/:slug`
- **THEN** the entity is returned with HTTP 200

#### Scenario: Player cannot view dm_only entity

- **GIVEN** a campaign with an entity whose visibility is `dm_only`
- **WHEN** a player sends `GET /api/campaigns/:id/entities/:slug`
- **THEN** the server returns HTTP 404

#### Scenario: Player can view members-visible entity

- **GIVEN** a campaign with an entity whose visibility is `members`
- **WHEN** a player (campaign member) sends `GET /api/campaigns/:id/entities/:slug`
- **THEN** the entity is returned with HTTP 200

#### Scenario: Private entity visible only to creator

- **GIVEN** a campaign with an entity whose visibility is `private`, created by user A
- **WHEN** user A sends `GET /api/campaigns/:id/entities/:slug`
- **THEN** the entity is returned with HTTP 200
- **WHEN** user B (also a campaign member) sends `GET /api/campaigns/:id/entities/:slug`
- **THEN** the server returns HTTP 404

#### Scenario: Entity with specific_users visibility checks entity_specific_viewers

- **GIVEN** an entity with visibility `specific_users` and user A listed in `entity_specific_viewers`
- **WHEN** user A sends `GET /api/campaigns/:id/entities/:slug`
- **THEN** the entity is returned with HTTP 200
- **WHEN** user B (not in `entity_specific_viewers`) sends the same request
- **THEN** the server returns HTTP 404

#### Scenario: Entity-level user permission override grants access

- **GIVEN** an entity with visibility `dm_only` but an `entityPermissions` row granting user A `view` with effect `allow`
- **WHEN** user A sends `GET /api/campaigns/:id/entities/:slug`
- **THEN** the entity is returned with HTTP 200

#### Scenario: Entity-level user permission override denies access

- **GIVEN** an entity with visibility `members` but an `entityPermissions` row for user A with `view` effect `deny`
- **WHEN** user A sends `GET /api/campaigns/:id/entities/:slug`
- **THEN** the server returns HTTP 404

---

### Requirement: Character GET endpoint enforces visibility

The system SHALL check entity visibility on `GET /api/campaigns/:id/characters/:slug` using the same `canUserAccessEntity` resolution chain. Characters are entities with `type = 'character'` and share the same visibility column.

#### Scenario: Player cannot view editor-only character

- **GIVEN** a character entity with visibility `editors`
- **WHEN** a player sends `GET /api/campaigns/:id/characters/:slug`
- **THEN** the server returns HTTP 404

#### Scenario: Editor can view editor-only character

- **GIVEN** a character entity with visibility `editors`
- **WHEN** an editor sends `GET /api/campaigns/:id/characters/:slug`
- **THEN** the character is returned with HTTP 200

---

### Requirement: Location GET endpoint enforces visibility

The system SHALL check entity visibility on `GET /api/campaigns/:id/locations/:slug` using `canUserAccessEntity`.

#### Scenario: Visitor cannot view members-only location

- **GIVEN** a location entity with visibility `members`
- **WHEN** a visitor sends `GET /api/campaigns/:id/locations/:slug`
- **THEN** the server returns HTTP 404

#### Scenario: Player can view members-only location

- **GIVEN** a location entity with visibility `members`
- **WHEN** a player sends `GET /api/campaigns/:id/locations/:slug`
- **THEN** the location is returned with HTTP 200

---

### Requirement: Permission cache is used for GET visibility checks

The system SHALL use the existing LRU permission cache (`getCachedPermission` / `setCachedPermission`) when checking entity visibility on GET endpoints to avoid redundant database queries.

#### Scenario: Repeated access to same entity uses cache

- **GIVEN** a user has already accessed an entity (cache populated)
- **WHEN** the same user requests the same entity again within the cache TTL (5 minutes)
- **THEN** the permission check is served from cache without additional DB queries

---

### Requirement: List endpoints continue using buildVisibilityFilter

The existing `buildVisibilityFilter` function used by list endpoints (entities, locations, organizations) SHALL be applied consistently. `GET /api/campaigns/:id/characters` SHALL also call `buildVisibilityFilter` — it did not previously, despite that endpoint's own detail route (`GET /api/campaigns/:id/characters/:slug`) already enforcing visibility, which meant `dm_only`/`private` characters' names, portraits, and status leaked into the list for roles that could not open their detail page.

#### Scenario: List endpoint returns only visible entities for player

- **GIVEN** a campaign with entities of mixed visibility (public, members, dm_only)
- **WHEN** a player sends `GET /api/campaigns/:id/entities`
- **THEN** only entities visible to the player are returned (public and members)
- **AND** dm_only entities are excluded from the list

#### Scenario: Character list excludes dm_only characters for a player

- **GIVEN** a campaign with characters of mixed visibility, including one `dm_only` character
- **WHEN** a player sends `GET /api/campaigns/:id/characters`
- **THEN** the `dm_only` character does not appear in the returned list
- **AND** a co_dm or dm sending the same request sees the `dm_only` character included

#### Scenario: Character list excludes private characters from non-creators

- **GIVEN** a character entity with visibility `private`, created by user A
- **WHEN** user B (a campaign member, not user A) sends `GET /api/campaigns/:id/characters`
- **THEN** that character is excluded from user B's returned list
- **AND** user A's own `GET /api/campaigns/:id/characters` request includes it

#### Scenario: Organization list excludes dm_only organizations for a player

- **GIVEN** a campaign with organizations of mixed visibility, including one `dm_only` organization
- **WHEN** a player sends `GET /api/campaigns/:id/organizations`
- **THEN** the `dm_only` organization does not appear in the returned list
- **AND** a co_dm or dm sending the same request sees it included

### Requirement: Organization GET endpoint enforces visibility

The system SHALL check entity visibility on `GET /api/campaigns/:id/organizations/:slug` using the same `canUserAccessEntity` resolution chain as characters and locations. Organizations are mirror entities (`organizations.id === entities.id`) sharing the same visibility column via their `entities` row.

#### Scenario: DM can view any organization regardless of visibility

- **GIVEN** an organization whose visibility is `dm_only`
- **WHEN** the DM sends `GET /api/campaigns/:id/organizations/:slug`
- **THEN** the organization is returned with HTTP 200

#### Scenario: Player cannot view dm_only organization

- **GIVEN** an organization whose visibility is `dm_only`
- **WHEN** a player sends `GET /api/campaigns/:id/organizations/:slug`
- **THEN** the server returns HTTP 404

#### Scenario: Player can view members-visible organization

- **GIVEN** an organization whose visibility is `members`
- **WHEN** a player (campaign member) sends `GET /api/campaigns/:id/organizations/:slug`
- **THEN** the organization is returned with HTTP 200
