# sub-campaigns Specification

## Purpose

TBD - created by archiving change sub-campaigns. Update Purpose after archive.

## Requirements

### Requirement: Sub-campaign CRUD

The system SHALL support named sub-campaigns scoped to a single campaign, each with `name`, `slug` (unique within the campaign), optional `description`, optional `imageUrl`, `sortOrder`, and an `isDefault` flag.

#### Scenario: List sub-campaigns

- **WHEN** a campaign member calls `GET /api/campaigns/[id]/sub-campaigns`
- **THEN** the response includes every sub-campaign of that campaign, ordered by `sortOrder`, each carrying its `isDefault` flag

#### Scenario: Create a sub-campaign

- **WHEN** a co_dm or higher calls `POST /api/campaigns/[id]/sub-campaigns` with `{ "name": "Mortales" }`
- **THEN** a new sub-campaign is created with `isDefault: false` and a slug derived from the name

#### Scenario: Update a sub-campaign

- **WHEN** a co_dm or higher calls `PUT /api/campaigns/[id]/sub-campaigns/[slug]` with a new `name` or `description`
- **THEN** the sub-campaign is updated, including the default sub-campaign (its name/description are editable, only deletion is blocked)

#### Scenario: Player cannot create or update a sub-campaign

- **WHEN** a user whose campaign role is `player` calls `POST` or `PUT` on the sub-campaigns endpoint
- **THEN** the response is 403

### Requirement: Every campaign has exactly one default sub-campaign

The system SHALL auto-create one sub-campaign flagged `isDefault: true` when a campaign is created, named "General". Exactly one sub-campaign per campaign SHALL have `isDefault: true` at all times.

#### Scenario: New campaign gets a default sub-campaign

- **WHEN** `POST /api/campaigns` creates a new campaign
- **THEN** a sub-campaign named "General" with `isDefault: true` is created for it in the same operation, alongside existing entity-type and relation-type seeding

#### Scenario: Default sub-campaign cannot be deleted

- **WHEN** a co_dm or higher calls `DELETE /api/campaigns/[id]/sub-campaigns/[slug]` where `[slug]` resolves to the default sub-campaign
- **THEN** the response is 422 and the sub-campaign is not deleted

### Requirement: Deleting a non-default sub-campaign reassigns its content to the default

The system SHALL, when deleting a non-default sub-campaign, reassign every arc, session, and quest currently pointing at it to the campaign's default sub-campaign, in the same transaction as the delete.

#### Scenario: Deleting a sub-campaign reassigns its arcs, sessions, and quests

- **GIVEN** a non-default sub-campaign `mortales` with 3 arcs, 12 sessions, and 2 quests assigned to it
- **WHEN** a co_dm calls `DELETE /api/campaigns/[id]/sub-campaigns/mortales`
- **THEN** the response is 200
- **AND** all 3 arcs, 12 sessions, and 2 quests now have `subCampaignId` pointing at the campaign's default sub-campaign
- **AND** the `mortales` row no longer exists

### Requirement: Arcs and quests are assignable to a sub-campaign by slug

`POST`/`PUT` on `/api/campaigns/[id]/arcs` and `/api/campaigns/[id]/quests` SHALL accept an optional `subCampaignSlug` body field, resolved against that campaign's sub-campaigns. When omitted on create, the arc/quest SHALL be assigned to the campaign's default sub-campaign. An unresolvable slug MUST return 404; an ambiguous slug (if the schema ever permits duplicate slugs) MUST return 409, mirroring the existing `arcSlug` resolution pattern on sessions.

#### Scenario: Creating an arc without a sub-campaign uses the default

- **WHEN** a co_dm sends `POST /api/campaigns/[id]/arcs` with `{ "name": "El Fuego Bajo Berlín" }` and no `subCampaignSlug`
- **THEN** the created arc's `subCampaignId` is the campaign's default sub-campaign

#### Scenario: Creating an arc with an explicit sub-campaign

- **GIVEN** a sub-campaign `mortales` exists in the campaign
- **WHEN** a co_dm sends `POST /api/campaigns/[id]/arcs` with `{ "name": "Sangre en Kreuzberg", "subCampaignSlug": "mortales" }`
- **THEN** the created arc's `subCampaignId` is `mortales`'s id

#### Scenario: Moving a quest to another sub-campaign

- **WHEN** a co_dm sends `PUT /api/campaigns/[id]/quests/[slug]` with `{ "subCampaignSlug": "mortales" }`
- **THEN** the quest's `subCampaignId` is updated to `mortales`'s id

#### Scenario: Unknown sub-campaign slug returns 404

- **WHEN** a co_dm sends `{ "subCampaignSlug": "nonexistent" }` on an arc or quest create/update
- **THEN** the response is 404 quoting `nonexistent` and no row is modified

### Requirement: Arc and quest lists can be filtered by sub-campaign

`GET /api/campaigns/[id]/arcs` and `GET /api/campaigns/[id]/quests` SHALL accept an optional `subCampaignSlug` query parameter, filtering to rows whose `subCampaignId` matches, applied before pagination and counting. An unknown slug MUST return an empty result rather than an error.

#### Scenario: Filter arcs by sub-campaign

- **GIVEN** 4 of 15 arcs assigned to sub-campaign `mortales`
- **WHEN** a member requests `GET /api/campaigns/[id]/arcs?subCampaignSlug=mortales`
- **THEN** exactly those 4 arcs are returned

#### Scenario: Unknown sub-campaign slug yields an empty list

- **WHEN** a member requests `?subCampaignSlug=nonexistent`
- **THEN** the response is 200 with an empty list, not an error

### Requirement: CLI sub-campaign management

The aleph-cli SHALL provide `aleph sub-campaign list|create|update|delete` mirroring the removed `session-group` command, plus a `--subcampaign <slug>` option on `arc create`, `arc update`, `arc list`, `quest create`, `quest update`, and `quest list`.

#### Scenario: List sub-campaigns via CLI

- **WHEN** the user runs `aleph sub-campaign list --campaign <id>`
- **THEN** the CLI prints each sub-campaign's name, slug, and whether it is the default

#### Scenario: Create an arc in a specific sub-campaign via CLI

- **WHEN** the user runs `aleph arc create --campaign <id> --name "Sangre en Kreuzberg" --subcampaign mortales`
- **THEN** the arc is created with `subCampaignSlug: "mortales"` in the request body

#### Scenario: Filter arcs by sub-campaign via CLI

- **WHEN** the user runs `aleph arc list --campaign <id> --subcampaign mortales`
- **THEN** the CLI requests `GET /api/campaigns/<id>/arcs?subCampaignSlug=mortales`

#### Scenario: Deleting the default sub-campaign via CLI is rejected

- **WHEN** the user runs `aleph sub-campaign delete <default-slug> --campaign <id> --yes`
- **THEN** the CLI prints the server's 422 error and exits non-zero, and the sub-campaign is not deleted
