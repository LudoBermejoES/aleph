## ADDED Requirements

### Requirement: boardSummary entity field

The system SHALL support an optional `boardSummary` text field on entities, used exclusively for the graph card layout, allowing DMs to write a short board-optimised label separate from the main entity summary.

#### Scenario: boardSummary stored per entity

- **GIVEN** a DM editing an entity via the entity edit form
- **WHEN** they fill in the "Graph label" field (max 120 chars, shown under the Summary field)
- **THEN** the value is saved to the `board_summary` column on the `entities` table
- AND the field is optional; existing entities default to `null`

#### Scenario: boardSummary accepted and validated by PUT /api/campaigns/{id}/entities/{slug}

- **GIVEN** an authenticated PUT request to the entity update endpoint
- **WHEN** the request body includes `boardSummary` as a non-empty string
- **THEN** the value is saved if it is 120 characters or fewer
- AND a 422 error is returned if the value exceeds 120 characters

#### Scenario: boardSummary used in graph card layout

- **GIVEN** the graph card layout is active and an entity has `boardSummary` set
- **WHEN** the node card is rendered
- **THEN** the card displays `boardSummary` instead of the main `summary`

#### Scenario: boardSummary falls back to summary in card layout

- **GIVEN** the graph card layout is active and an entity has no `boardSummary`
- **WHEN** the node card is rendered
- **THEN** the card displays the first 80 characters of `summary` (truncated with ellipsis)
- AND if both are null, only the entity name and type badge are shown

#### Scenario: boardSummary exposed in graph API response

- **GIVEN** an authenticated GET request to `/api/campaigns/{id}/graph`
- **WHEN** the response is serialised
- **THEN** each node object includes a `boardSummary` field (string or null)

#### Scenario: Unauthenticated graph request excludes boardSummary

- **GIVEN** an unauthenticated GET request to `/api/campaigns/{id}/graph`
- **WHEN** the campaign requires authentication
- **THEN** a 401 response is returned
- AND `boardSummary` is never exposed to unauthenticated callers

#### Scenario: boardSummary not used in wiki or search

- **GIVEN** the wiki entity detail page or global search results
- **WHEN** entity summaries are displayed
- **THEN** only the main `summary` field is shown
- AND `boardSummary` does not appear as a searchable or filterable field

#### Scenario: boardSummary accessible via CLI entity update

- **GIVEN** the `aleph entity update` CLI command
- **WHEN** called with `--board-summary "short label"`
- **THEN** the entity's `boardSummary` is updated on the server
- AND `aleph entity show` includes the `boardSummary` value when it is set
