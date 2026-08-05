# arc-relations Specification

## Purpose

TBD - created by archiving change relatable-sessions-arcs. Update Purpose after archive.

## Requirements

### Requirement: Arc creation produces a campaign-wide unique slug and registers a mirror entity

The system SHALL assign each newly created arc a slug unique across all entities in the campaign (not merely unique among arcs), and SHALL insert a corresponding row into `entities` (`type: "arc"`) so the arc resolves through the generic entity lookup and can participate in the relation graph, mirroring the pattern already used for characters, organizations, and quests.

#### Scenario: Creating an arc with a name that does not collide

- **GIVEN** an editor and no existing entity or arc named "El camino hasta Oda" in campaign `camp-1`
- **WHEN** `POST /api/campaigns/camp-1/arcs` is called with `name: "El camino hasta Oda"`
- **THEN** the created arc's slug is `el-camino-hasta-oda`
- **AND** a row is inserted into `entities` with `type: "arc"` and the same `name`, sharing the arc's own `id`

#### Scenario: Creating an arc whose name collides with an existing entity

- **GIVEN** an editor
- **AND** a character entity with slug `el-camino-hasta-oda` already exists in campaign `camp-1`
- **WHEN** `POST /api/campaigns/camp-1/arcs` is called with `name: "El camino hasta Oda"`
- **THEN** the created arc is assigned a de-duplicated slug distinct from `el-camino-hasta-oda`
- **AND** arc creation succeeds rather than failing on a unique-constraint violation

### Requirement: Arc slugs resolve through the generic entity lookup

The system SHALL return an arc when it is looked up via `GET /api/campaigns/:id/entities/:slug`.

#### Scenario: Resolving an arc slug as an authenticated editor

- **GIVEN** an editor with a valid session or `X-API-Key`
- **AND** an arc "El camino hasta Oda" exists in campaign `camp-1` with slug `el-camino-hasta-oda`
- **WHEN** the client requests `GET /api/campaigns/camp-1/entities/el-camino-hasta-oda`
- **THEN** the response is 200 with the arc's mirror entity, including `type: "arc"`, matching `name`, and an `id` usable in relation calls

#### Scenario: Resolving an arc slug without authentication

- **GIVEN** no session cookie and no `X-API-Key` header
- **WHEN** the client requests `GET /api/campaigns/camp-1/entities/el-camino-hasta-oda`
- **THEN** the response is 401

### Requirement: Arcs can be linked to other entities via the relation system

The system SHALL allow creating, listing, and deleting relations where the source and/or target is an arc, using the existing relation endpoints and CLI commands, with no arc-specific code path.

#### Scenario: DM links an arc to the location where it centers

- **GIVEN** a campaign DM
- **AND** an arc "El hotel de Oda" and a location "La Capilla" exist in the same campaign
- **WHEN** the DM runs `aleph relation create --campaign camp-1 --source el-hotel-de-oda --target la-capilla --forward "parte de" --reverse "es el hogar de la cábala durante"`
- **THEN** the relation is created successfully

#### Scenario: An arc can be linked to the sessions that belong to it

- **GIVEN** an editor
- **AND** an arc and one of the sessions assigned to it (via `sessions.arcId`) both exist
- **WHEN** the editor creates a relation between the session and the arc
- **THEN** the relation is created successfully, independent of and in addition to the existing `sessions.arcId` structural assignment

#### Scenario: Visitor cannot create a relation involving an arc

- **GIVEN** a user with the `visitor` or `player` role
- **WHEN** they attempt `POST /api/campaigns/camp-1/relations` with an arc as source or target
- **THEN** the response is 403

#### Scenario: Cross-campaign arc relation is rejected

- **GIVEN** an arc in campaign `camp-1` and an entity in campaign `camp-2`
- **WHEN** a relation is attempted between them
- **THEN** the response is 400 with message "Both entities must be in the same campaign"

### Requirement: Pre-existing arcs are relatable without recreation

The system SHALL ensure arcs created before this change gained a mirror `entities` row through a one-time boot-time backfill.

#### Scenario: An arc created before this feature existed is relatable

- **GIVEN** an arc that was created prior to this change shipping
- **AND** the backfill has run
- **WHEN** `GET /api/campaigns/:id/entities/:slug` is called with that arc's slug
- **THEN** the arc's mirror entity is returned
- **AND** `relation create` succeeds using that arc's slug as source or target

### Requirement: Renaming or deleting an arc keeps its mirror entity in sync

The system SHALL propagate an arc name change to its mirror entity's `name`, and SHALL remove the mirror entity (cascading any relations referencing it) when the arc is deleted.

#### Scenario: Renaming an arc updates the mirror entity's name

- **GIVEN** an arc named "Act I"
- **WHEN** `PUT /api/campaigns/camp-1/arcs/act-i` is called with `name: "El camino hasta Oda"`
- **THEN** `GET /api/campaigns/camp-1/entities/act-i` returns `name: "El camino hasta Oda"`

#### Scenario: Deleting an arc removes its mirror entity and relations

- **GIVEN** an arc with an existing relation to a location
- **WHEN** `DELETE /api/campaigns/camp-1/arcs/<slug>` is called
- **THEN** the arc is deleted (and any sessions pointing at it have `arcId` cleared, unchanged existing behavior)
- **AND** `GET /api/campaigns/camp-1/entities/<slug>` returns 404
- **AND** the relation no longer appears in `relation list` for the location
