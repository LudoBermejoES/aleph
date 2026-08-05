# session-relations Specification

## Purpose

TBD - created by archiving change relatable-sessions-arcs. Update Purpose after archive.

## Requirements

### Requirement: Session slugs resolve through the generic entity lookup

The system SHALL return a session when it is looked up via `GET /api/campaigns/:id/entities/:slug`, using the same unified `entities` lookup already used for characters, organizations, locations, wiki entities, and quests.

#### Scenario: Resolving a session slug as an authenticated editor

- **GIVEN** an editor (or higher) with a valid session or `X-API-Key`
- **AND** a session titled "La noche que se tragó a Clara" exists in campaign `camp-1` with slug `la-noche-que-se-trago-a-clara`
- **WHEN** the client requests `GET /api/campaigns/camp-1/entities/la-noche-que-se-trago-a-clara`
- **THEN** the response is 200 with the session's mirror entity, including `type: "session"`, matching `name`, and an `id` usable as `sourceEntityId`/`targetEntityId` in relation calls

#### Scenario: Resolving a session slug without authentication

- **GIVEN** no session cookie and no `X-API-Key` header
- **WHEN** the client requests `GET /api/campaigns/camp-1/entities/la-noche-que-se-trago-a-clara`
- **THEN** the response is 401 and no session data is returned

#### Scenario: Resolving a nonexistent session slug

- **GIVEN** an authenticated editor
- **WHEN** the client requests `GET /api/campaigns/camp-1/entities/no-such-session`
- **THEN** the response is 404 with message "Entity not found"

### Requirement: Sessions can be linked to other entities via the relation system

The system SHALL allow creating, listing, and deleting relations where the source and/or target is a session, using the existing `POST/GET /api/campaigns/:id/relations` and `DELETE /api/campaigns/:id/relations/:relationId` endpoints and the existing `relation create/list/delete` CLI commands, with no session-specific code path.

#### Scenario: DM links a session to a character who was present

- **GIVEN** a campaign DM
- **AND** a session "La noche que se tragó a Clara" (slug `la-noche-que-se-trago-a-clara`) and a character "Clara Böhm" (slug `clara-bohm`) exist in the same campaign
- **WHEN** the DM runs `aleph relation create --campaign camp-1 --source la-noche-que-se-trago-a-clara --target clara-bohm --forward "contó con" --reverse "participó en"`
- **THEN** the CLI resolves both slugs successfully via `GET /api/campaigns/camp-1/entities/:slug`
- **AND** `POST /api/campaigns/camp-1/relations` creates an `entity_relations` row with `forwardLabel: "contó con"`, `reverseLabel: "participó en"`
- **AND** the CLI prints "Relation created: <id>"

#### Scenario: Editor links a session to a location where it took place

- **GIVEN** an editor
- **AND** a session and a location "La fábrica (sala de fiestas)" exist in the same campaign
- **WHEN** the editor runs `aleph relation create --campaign camp-1 --source <session-slug> --target la-fabrica-sala-de-fiestas --forward "tuvo lugar en" --reverse "fue escenario de"`
- **THEN** the relation is created successfully, exactly as for any other entity pair

#### Scenario: Two sessions can be related to each other

- **GIVEN** an editor
- **AND** two sessions in the same campaign, one narratively continuing the other
- **WHEN** the editor runs `aleph relation create --campaign camp-1 --source <session-b-slug> --target <session-a-slug> --forward "continúa a" --reverse "es continuada por"`
- **THEN** the relation is created successfully

#### Scenario: Visitor cannot create a relation involving a session

- **GIVEN** a user with the `visitor` or `player` role
- **WHEN** they attempt `POST /api/campaigns/camp-1/relations` with a session as source or target
- **THEN** the response is 403 with message "Editors or above can create relations"

#### Scenario: Listing relations for a session

- **GIVEN** a session with an existing relation to a character
- **WHEN** a campaign member runs `aleph relation list --campaign camp-1 --entity <session-slug>`
- **THEN** the CLI resolves the session's entity id and calls `GET /api/campaigns/camp-1/relations?entity_id=<id>`
- **AND** the relation to the character is included in the output

#### Scenario: Deleting a relation involving a session

- **GIVEN** an editor and an existing relation between a session and a character
- **WHEN** the editor runs `aleph relation delete <relationId> --campaign camp-1 --yes`
- **THEN** `DELETE /api/campaigns/camp-1/relations/:relationId` succeeds
- **AND** the relation no longer appears in `relation list` for either the session or the character

#### Scenario: Cross-campaign session relation is rejected

- **GIVEN** a session in campaign `camp-1` and an entity in campaign `camp-2`
- **WHEN** a relation is attempted between them
- **THEN** the response is 400 with message "Both entities must be in the same campaign"

### Requirement: Pre-existing sessions are relatable without recreation

The system SHALL ensure sessions created before this change gained a mirror `entities` row through a one-time boot-time backfill, so they resolve and can be related exactly like sessions created after the change.

#### Scenario: A session created before this feature existed is relatable

- **GIVEN** a session that was created prior to this change shipping (no mirror entity existed at creation time)
- **AND** the backfill has run
- **WHEN** `GET /api/campaigns/:id/entities/:slug` is called with that session's slug
- **THEN** the session's mirror entity is returned
- **AND** `relation create` succeeds using that session's slug as source or target

### Requirement: Renaming or deleting a session keeps its mirror entity in sync

The system SHALL propagate a session title change to its mirror entity's `name`, and SHALL remove the mirror entity (cascading any relations referencing it) when the session is deleted.

#### Scenario: Renaming a session updates the mirror entity's name

- **GIVEN** a session with title "Session 42"
- **WHEN** `PUT /api/campaigns/camp-1/sessions/session-42` is called with `title: "La noche que se tragó a Clara"`
- **THEN** `GET /api/campaigns/camp-1/entities/session-42` returns `name: "La noche que se tragó a Clara"`

#### Scenario: Deleting a session removes its mirror entity and relations

- **GIVEN** a session with an existing relation to a character
- **WHEN** `DELETE /api/campaigns/camp-1/sessions/<slug>` is called
- **THEN** the session is deleted
- **AND** `GET /api/campaigns/camp-1/entities/<slug>` returns 404
- **AND** the relation no longer appears in `relation list` for the character
