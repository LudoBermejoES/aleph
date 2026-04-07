## MODIFIED Requirements

### Requirement: Full Campaign JSON Export

The system SHALL export all campaign data as a ZIP archive via an API endpoint.

#### Scenario: Exporting a full campaign returns a ZIP

- **GIVEN** a user with the `dm` role on a campaign that has entities, characters, sessions, and other resources
- **WHEN** the user sends `GET /api/campaigns/:id/export`
- **THEN** the response status is 200
- **AND** the response has `Content-Type: application/zip`
- **AND** the response has a `Content-Disposition` header with a filename containing the campaign slug and date, ending in `.zip`
- **AND** the ZIP contains `campaign.json` with a `version` field set to `"1.2"`
- **AND** `campaign.json` contains an `exportedAt` ISO timestamp
- **AND** `campaign.json` contains a `campaign` object with the campaign metadata
- **AND** `campaign.json` contains arrays for all resource types

#### Scenario: Export includes all resource types in campaign.json

- **GIVEN** a campaign with at least one record in entities, characters, sessions, organizations, quests, maps, calendars, timelines, relations, items, inventories, currencies, shops, arcs, chapters, and rolls
- **WHEN** the DM exports the campaign
- **THEN** `campaign.json` in the ZIP contains each resource type array with the correct number of records

#### Scenario: Export of empty campaign

- **GIVEN** a campaign with no entities, characters, sessions, or other child resources
- **WHEN** the DM exports the campaign
- **THEN** the ZIP contains `campaign.json` with empty arrays for all resource types
- **AND** the `campaign` object contains the campaign metadata

## MODIFIED Requirements

### Requirement: Frontend Export Button

The system SHALL provide a download button on the campaign dashboard for DMs and co-DMs.

#### Scenario: DM sees the export button

- **GIVEN** a user with the `dm` role viewing the campaign dashboard
- **WHEN** the page loads
- **THEN** an "Export Campaign" button is visible

#### Scenario: Player does not see the export button

- **GIVEN** a user with the `player` role viewing the campaign dashboard
- **WHEN** the page loads
- **THEN** no export button is visible

#### Scenario: Clicking the export button downloads a ZIP file

- **GIVEN** a DM on the campaign dashboard
- **WHEN** the DM clicks the "Export Campaign" button
- **THEN** a ZIP file download is triggered in the browser
- **AND** the filename contains the campaign slug and ends in `.zip`

## MODIFIED Requirements

### Requirement: CLI Export Command

The system SHALL provide a CLI command to export campaign data as a ZIP file.

#### Scenario: Exporting via CLI to a file

- **GIVEN** a configured CLI with valid API key
- **WHEN** the user runs `aleph campaign export <id> --output export.zip`
- **THEN** the file `export.zip` is created as a valid ZIP archive containing `campaign.json`

#### Scenario: Exporting via CLI without --output requires flag

- **GIVEN** a configured CLI with valid API key
- **WHEN** the user runs `aleph campaign export <id>` without `--output`
- **THEN** the CLI prints an error indicating that `--output` is required for ZIP exports

#### Scenario: Selective CLI export

- **GIVEN** a configured CLI with valid API key
- **WHEN** the user runs `aleph campaign export <id> --include entities,characters`
- **THEN** `campaign.json` in the ZIP contains only the specified resource types plus the campaign envelope

#### Scenario: CLI export with invalid campaign ID

- **GIVEN** a configured CLI with valid API key
- **WHEN** the user runs `aleph campaign export nonexistent-id`
- **THEN** the CLI prints an error message indicating the campaign was not found
- **AND** the exit code is non-zero
