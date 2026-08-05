## ADDED Requirements

### Requirement: Session creation produces a campaign-wide unique slug

The system SHALL assign each newly created session a slug that is unique across all entities in the campaign (not merely unique among sessions), using the same collision-detection already applied to character and quest creation, since sessions now also occupy a row in the shared `entities` table.

#### Scenario: Creating a session with a title that does not collide

- **GIVEN** an editor and no existing entity or session named "La noche que se tragó a Clara" in campaign `camp-1`
- **WHEN** `POST /api/campaigns/camp-1/sessions` is called with `title: "La noche que se tragó a Clara"`
- **THEN** the created session's slug is `la-noche-que-se-trago-a-clara`

#### Scenario: Creating a session whose title collides with an existing entity

- **GIVEN** an editor
- **AND** a location entity with slug `la-fabrica` already exists in campaign `camp-1`
- **WHEN** `POST /api/campaigns/camp-1/sessions` is called with `title: "La fábrica"`
- **THEN** the created session is assigned a de-duplicated slug distinct from `la-fabrica`
- **AND** session creation succeeds rather than failing on a unique-constraint violation

### Requirement: Session creation registers a mirror entity for relation support

The system SHALL insert a corresponding row into the `entities` table (`type: "session"`) whenever a session is created, mirroring the pattern already used for characters, organizations, and quests, without altering the existing session log-file, attendance, or arc/chapter assignment behavior.

#### Scenario: Creating a session also creates its mirror entity

- **GIVEN** an editor
- **WHEN** `POST /api/campaigns/camp-1/sessions` is called with `title: "La noche que se tragó a Clara"`
- **THEN** a row is inserted into `entities` with `type: "session"` and the same `name`
- **AND** the session's `id` and the mirror entity's `id` are the same value
- **AND** the session's existing `arcId`/`chapterId`/`subCampaignId` assignment behavior is unaffected

#### Scenario: Existing session detail fields are unchanged

- **GIVEN** a session with a summary, attendance records, and an arc assignment
- **WHEN** a campaign member views the session detail page
- **THEN** the summary, attendance, and arc/chapter display exactly as before this change
