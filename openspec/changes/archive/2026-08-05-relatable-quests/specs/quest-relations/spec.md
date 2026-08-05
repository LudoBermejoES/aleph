## ADDED Requirements

### Requirement: Quest slugs resolve through the generic entity lookup

The system SHALL return a quest when it is looked up via `GET /api/campaigns/:id/entities/:slug`, using the same unified `entities` lookup already used for characters, organizations, and wiki entities, so that CLI/API consumers do not need a quest-specific resolution path.

#### Scenario: Resolving a quest slug as an authenticated editor

- **GIVEN** an editor (or higher) with a valid session or `X-API-Key`
- **AND** a quest "Impedir la corrupción de Tezgul" exists in campaign `camp-1` with slug `impedir-la-corrupcion-de-tezgul`
- **WHEN** the client requests `GET /api/campaigns/camp-1/entities/impedir-la-corrupcion-de-tezgul`
- **THEN** the response is 200 with the quest's mirror entity, including `type: "quest"`, matching `name`, and an `id` usable as `sourceEntityId`/`targetEntityId` in relation calls

#### Scenario: Resolving a quest slug without authentication

- **GIVEN** no session cookie and no `X-API-Key` header
- **WHEN** the client requests `GET /api/campaigns/camp-1/entities/impedir-la-corrupcion-de-tezgul`
- **THEN** the response is 401 and no quest data is returned

#### Scenario: Resolving a nonexistent quest slug

- **GIVEN** an authenticated editor
- **WHEN** the client requests `GET /api/campaigns/camp-1/entities/no-such-quest`
- **THEN** the response is 404 with message "Entity not found"

### Requirement: Quests can be linked to other entities via the relation system

The system SHALL allow creating, listing, and deleting relations (`entity_relations`) where the source and/or target is a quest, using the existing `POST/GET /api/campaigns/:id/relations` and `DELETE /api/campaigns/:id/relations/:relationId` endpoints and the existing `relation create/list/delete` CLI commands, with no quest-specific code path.

#### Scenario: DM links a sub-quest to its main quest with custom labels

- **GIVEN** a campaign DM
- **AND** quests "Impedir la corrupción de Tezgul" (slug `impedir-la-corrupcion-de-tezgul`) and "Encontrar al herrero" (slug `encontrar-al-herrero`) exist in the same campaign
- **WHEN** the DM runs `aleph relation create --campaign camp-1 --source encontrar-al-herrero --target impedir-la-corrupcion-de-tezgul --forward "es parte de" --reverse "incluye la sub-misión"`
- **THEN** the CLI resolves both slugs successfully via `GET /api/campaigns/camp-1/entities/:slug`
- **AND** `POST /api/campaigns/camp-1/relations` creates an `entity_relations` row with `forwardLabel: "es parte de"`, `reverseLabel: "incluye la sub-misión"`
- **AND** the CLI prints "Relation created: <id>"

#### Scenario: Editor links a quest to a non-quest entity

- **GIVEN** an editor
- **AND** a quest "Encontrar al herrero" and a character "Dain Golka" exist in the same campaign
- **WHEN** the editor runs `aleph relation create --campaign camp-1 --source encontrar-al-herrero --target dain-golka --forward "dado por" --reverse "encargó"`
- **THEN** the relation is created successfully, exactly as for any other entity pair

#### Scenario: Visitor cannot create a relation involving a quest

- **GIVEN** a user with the `visitor` or `player` role
- **WHEN** they attempt `POST /api/campaigns/camp-1/relations` with a quest as source or target
- **THEN** the response is 403 with message "Editors or above can create relations"

#### Scenario: Listing relations for a quest

- **GIVEN** a quest with an existing "es parte de" relation to its main quest
- **WHEN** a campaign member runs `aleph relation list --campaign camp-1 --entity encontrar-al-herrero`
- **THEN** the CLI resolves the quest's entity id and calls `GET /api/campaigns/camp-1/relations?entity_id=<id>`
- **AND** the relation to the main quest is included in the output

#### Scenario: Deleting a relation involving a quest

- **GIVEN** an editor and an existing relation between two quests
- **WHEN** the editor runs `aleph relation delete <relationId> --campaign camp-1 --yes`
- **THEN** `DELETE /api/campaigns/camp-1/relations/:relationId` succeeds
- **AND** the relation no longer appears in `relation list` for either quest

#### Scenario: Cross-campaign quest relation is rejected

- **GIVEN** a quest in campaign `camp-1` and a quest in campaign `camp-2`
- **WHEN** a relation is attempted between them
- **THEN** the response is 400 with message "Both entities must be in the same campaign"

### Requirement: Pre-existing quests are relatable without recreation

The system SHALL ensure quests created before this change gained a mirror `entities` row through a one-time backfill migration, so they resolve and can be related exactly like quests created after the change.

#### Scenario: A quest created before this feature existed is relatable

- **GIVEN** a quest that was created prior to this change shipping (no mirror entity existed at creation time)
- **AND** the backfill migration has run
- **WHEN** `GET /api/campaigns/:id/entities/:slug` is called with that quest's slug
- **THEN** the quest's mirror entity is returned
- **AND** `relation create` succeeds using that quest's slug as source or target
