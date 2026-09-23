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

### Requirement: A chapter's sub-campaign is derived from its arc

A chapter SHALL report the sub-campaign of the arc it belongs to. The system MUST NOT store a
`sub_campaign_id` on `chapters`: the value is resolved through `chapters.arcId -> arcs.subCampaignId`
on read, so that an arc and its chapters can never disagree about which storyline they are in. The
chapter list and detail projections SHALL include `subCampaignId` and `subCampaignName`.

#### Scenario: A chapter reports its arc's sub-campaign

- **GIVEN** an arc `sangre-en-kreuzberg` assigned to sub-campaign `mortales`, holding a chapter `el-mercado`
- **WHEN** a campaign member requests `GET /api/campaigns/:id/chapters`
- **THEN** `el-mercado` carries `subCampaignName: "Mortales"` and the `subCampaignId` of `mortales`

#### Scenario: Moving the arc moves the chapter's reported sub-campaign

- **GIVEN** the same chapter, and its arc then reassigned to sub-campaign `general`
- **WHEN** the member requests the chapter again
- **THEN** it reports `general`, with no separate write to the chapter having occurred

### Requirement: A chapter's sub-campaign cannot be assigned directly

`POST` and `PUT` on `/api/campaigns/:id/chapters` SHALL reject a body carrying `subCampaignSlug` or
`subCampaignId` with **422**, naming the arc as the way to change it. The field MUST NOT be accepted
and discarded.

#### Scenario: Writing a chapter's sub-campaign is refused, not ignored

- **WHEN** a co_dm sends `PUT /api/campaigns/:id/chapters/el-mercado` with `{ "subCampaignSlug": "general" }`
- **THEN** the response is 422 and the message names the arc as the route to change it
- **AND** the chapter is unchanged

### Requirement: Chapters can be listed campaign-wide and filtered by sub-campaign

`GET /api/campaigns/:id/chapters` SHALL list every chapter of the route's campaign when no narrowing
parameter is given, instead of the current hard 400 demanding `arc_id`. It SHALL accept an optional
`subCampaignSlug` filtering to chapters whose arc belongs to that sub-campaign, composing with the
existing arc narrowing. An unknown slug MUST return an empty result rather than an error, matching
the arc, quest and session filters.

The endpoint SHALL also scope its arc narrowing to the route's campaign: an `arc_id` belonging to
another campaign MUST return an empty result, never that campaign's chapters.

#### Scenario: Listing every chapter of a campaign

- **GIVEN** a campaign with 5 arcs holding 14 chapters between them
- **WHEN** a member requests `GET /api/campaigns/:id/chapters` with no parameters
- **THEN** all 14 chapters are returned, each carrying its arc and sub-campaign

#### Scenario: Filtering chapters by sub-campaign

- **GIVEN** a campaign whose `mortales` sub-campaign holds 2 arcs with 5 chapters between them, and whose `general` sub-campaign holds 3 arcs with 9 chapters
- **WHEN** a member requests `?subCampaignSlug=mortales`
- **THEN** exactly those 5 chapters are returned

#### Scenario: Unknown sub-campaign slug yields an empty list

- **WHEN** a member requests `?subCampaignSlug=nonexistent`
- **THEN** the response is 200 with an empty list, not an error

#### Scenario: An arc from another campaign returns nothing

- **GIVEN** an arc belonging to campaign B
- **WHEN** a member of campaign A requests `GET /api/campaigns/A/chapters?arc_id=<that arc>`
- **THEN** the response is 200 with an empty list, and no chapter of campaign B is disclosed

### Requirement: A session's arc must belong to the session's sub-campaign

When a session is created or updated with an arc, the system SHALL verify that the arc's
`subCampaignId` equals the session's **effective** sub-campaign — the one from the request body when
`subCampaignSlug` is present, otherwise the session's stored one — and MUST return **422** naming
both sub-campaigns when they differ. No row may be modified by a refused request. This mirrors the
existing chapter/arc refusal, which stays unchanged.

#### Scenario: Assigning an arc from another sub-campaign is refused

- **GIVEN** a session in sub-campaign `mortales` and an arc `act-ii` in sub-campaign `general`
- **WHEN** a co_dm sends `PUT /api/campaigns/:id/sessions/:slug` with `{ "arcSlug": "act-ii" }`
- **THEN** the response is 422, the message names both `mortales` and `general`
- **AND** the session's `arcId` is unchanged

#### Scenario: Moving the session and assigning the arc in one request succeeds

- **GIVEN** the same session in `mortales` and the same arc `act-ii` in `general`
- **WHEN** a co_dm sends `{ "subCampaignSlug": "general", "arcSlug": "act-ii" }` in a single request
- **THEN** the response is 200, the session is in `general` and points at `act-ii`
- **AND** the outcome does not depend on the order the handler applies the two fields

#### Scenario: A session with no arc is unaffected

- **WHEN** a co_dm moves a session with `arcId` null to another sub-campaign
- **THEN** the response is 200 and no arc check is performed

#### Scenario: Creating a session with a mismatched arc is refused

- **WHEN** a co_dm sends `POST /api/campaigns/:id/sessions` with `subCampaignSlug` and an `arcSlug` from a different sub-campaign
- **THEN** the response is 422 and no session is created

### Requirement: Moving an arc to another sub-campaign moves its sessions

The system SHALL, when `PUT /api/campaigns/:id/arcs/:slug` changes an arc's sub-campaign, reassign
every session pointing at that arc to the same sub-campaign in the same transaction, and SHALL report
the number of sessions moved in the response as `movedSessions`. Chapters require no reassignment,
deriving their sub-campaign from the arc.

#### Scenario: Sessions follow their arc

- **GIVEN** an arc in `general` with 12 sessions and 3 chapters
- **WHEN** a co_dm sends `PUT .../arcs/:slug` with `{ "subCampaignSlug": "mortales" }`
- **THEN** the arc and all 12 sessions are in `mortales`
- **AND** the response reports `movedSessions: 12`
- **AND** the 3 chapters report `mortales` without any chapter row having been written

#### Scenario: A move that changes nothing reports zero

- **WHEN** a co_dm sends the arc's current sub-campaign slug
- **THEN** the response is 200 with `movedSessions: 0`

#### Scenario: The move is atomic

- **GIVEN** a failure occurs while reassigning the sessions
- **WHEN** the transaction rolls back
- **THEN** neither the arc nor any session has changed sub-campaign

### Requirement: Cross-sub-campaign incoherence can be audited and repaired

The system SHALL provide a read-only audit reporting every session whose arc belongs to a different
sub-campaign than the session, and a separate, explicitly-requested repair that reassigns each such
session to its arc's sub-campaign. The audit MUST NOT modify any row.

#### Scenario: The audit reports without changing anything

- **GIVEN** 4 sessions whose arc is in another sub-campaign
- **WHEN** a co_dm runs the audit
- **THEN** all 4 are listed with their session slug, their sub-campaign and their arc's sub-campaign
- **AND** no row has been modified

#### Scenario: Repair adopts the arc's sub-campaign

- **WHEN** a co_dm runs the audit with the repair flag
- **THEN** each reported session is reassigned to its arc's sub-campaign
- **AND** a re-run of the audit reports nothing

#### Scenario: A coherent campaign audits clean

- **GIVEN** a campaign where every session's arc matches its sub-campaign
- **WHEN** a co_dm runs the audit
- **THEN** it reports zero rows and exits successfully

### Requirement: Every arc, chapter and quest response names its sub-campaign

The arc, chapter and quest list, detail and create responses SHALL carry `subCampaignName` and
`subCampaignSlug` alongside `subCampaignId`, resolved by a left join in the same manner as the
sessions list already does. A response MUST NOT report a sub-campaign as a bare id.

This closes an asymmetry that is currently load-bearing in the wrong direction: all three can already
be **filtered** by sub-campaign while none of them ever **shows** which one a row belongs to, so a
filtered list is indistinguishable from an unfiltered one.

#### Scenario: The arcs list names the sub-campaign

- **WHEN** a member requests `GET /api/campaigns/:id/arcs`
- **THEN** each arc carries `subCampaignName` and `subCampaignSlug`, not only `subCampaignId`

#### Scenario: Creating an arc echoes its sub-campaign

- **WHEN** a co_dm creates an arc
- **THEN** the response includes the sub-campaign it landed in, so a client never has to re-read to find out

#### Scenario: The quest detail names the sub-campaign

- **WHEN** a member requests a single quest
- **THEN** the response carries `subCampaignName` and `subCampaignSlug`
