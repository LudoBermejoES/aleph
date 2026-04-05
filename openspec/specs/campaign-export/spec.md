# Campaign Data Export

## Requirement: Full Campaign JSON Export

The system SHALL export all campaign data as a single JSON file via an API endpoint.

### Scenario: Exporting a full campaign as JSON
- GIVEN a user with the `dm` role on a campaign that has entities, characters, sessions, and other resources
- WHEN the user sends `GET /api/campaigns/:id/export`
- THEN the response has `Content-Type: application/json`
- AND the response has a `Content-Disposition` header with a filename containing the campaign slug and date
- AND the JSON body contains a `version` field set to `"1.0"`
- AND the JSON body contains an `exportedAt` ISO timestamp
- AND the JSON body contains a `campaign` object with the campaign metadata
- AND the JSON body contains arrays for all resource types (`entities`, `characters`, `sessions`, `locations`, `organizations`, etc.)

### Scenario: Export includes all resource types
- GIVEN a campaign with at least one record in entities, characters, sessions, locations, organizations, quests, maps, calendars, timelines, relations, items, inventories, currencies, shops, arcs, chapters, and rolls
- WHEN the DM exports the campaign
- THEN each resource type array in the export contains the correct number of records
- AND each record includes all its database fields (excluding internal-only fields like content hashes)

### Scenario: Export of empty campaign
- GIVEN a campaign with no entities, characters, sessions, or other child resources
- WHEN the DM exports the campaign
- THEN the response is valid JSON with empty arrays for all resource types
- AND the `campaign` object contains the campaign metadata

---

## Requirement: Selective Export

The system SHALL support exporting only selected resource types via query parameter.

### Scenario: Exporting only entities and characters
- GIVEN a campaign with entities, characters, sessions, and locations
- WHEN the user sends `GET /api/campaigns/:id/export?include=entities,characters`
- THEN the JSON body contains the `campaign` object (always included)
- AND the JSON body contains `entities` and `characters` arrays with data
- AND the JSON body does NOT contain `sessions`, `locations`, or other resource type keys

### Scenario: Including an invalid resource type
- GIVEN a valid campaign
- WHEN the user sends `GET /api/campaigns/:id/export?include=entities,foobar`
- THEN the response includes the `entities` array
- AND the invalid key `foobar` is silently ignored (no error, no key in output)

### Scenario: Omitting the include parameter exports everything
- GIVEN a campaign with data in multiple resource types
- WHEN the user sends `GET /api/campaigns/:id/export` without the `include` parameter
- THEN all resource types are included in the export

---

## Requirement: Export Authorization

The system SHALL restrict export access to DMs and co-DMs of the campaign.

### Scenario: DM can export
- GIVEN a user with the `dm` role on a campaign
- WHEN the user sends `GET /api/campaigns/:id/export`
- THEN the response status is 200

### Scenario: Co-DM can export
- GIVEN a user with the `co_dm` role on a campaign
- WHEN the user sends `GET /api/campaigns/:id/export`
- THEN the response status is 200

### Scenario: Player cannot export
- GIVEN a user with the `player` role on a campaign
- WHEN the user sends `GET /api/campaigns/:id/export`
- THEN the response status is 403

### Scenario: Unauthenticated user cannot export
- GIVEN no authentication credentials
- WHEN a request is sent to `GET /api/campaigns/:id/export`
- THEN the response status is 401

### Scenario: Non-member cannot export
- GIVEN a user who is not a member of the campaign
- WHEN the user sends `GET /api/campaigns/:id/export`
- THEN the response status is 403

### Scenario: Export of non-existent campaign
- GIVEN an authenticated user
- WHEN the user sends `GET /api/campaigns/:id/export` with a non-existent campaign ID
- THEN the response status is 404

---

## Requirement: Frontend Export Button

The system SHALL provide a download button on the campaign dashboard for DMs and co-DMs.

### Scenario: DM sees the export button
- GIVEN a user with the `dm` role viewing the campaign dashboard
- WHEN the page loads
- THEN an "Export Campaign" button is visible

### Scenario: Player does not see the export button
- GIVEN a user with the `player` role viewing the campaign dashboard
- WHEN the page loads
- THEN no export button is visible

### Scenario: Clicking the export button downloads a JSON file
- GIVEN a DM on the campaign dashboard
- WHEN the DM clicks the "Export Campaign" button
- THEN a JSON file download is triggered in the browser
- AND the filename contains the campaign slug

---

## Requirement: CLI Export Command

The system SHALL provide a CLI command to export campaign data.

### Scenario: Exporting via CLI to a file
- GIVEN a configured CLI with valid API key
- WHEN the user runs `aleph campaign export <id> --output export.json`
- THEN the file `export.json` is created with valid campaign export JSON

### Scenario: Exporting via CLI to stdout
- GIVEN a configured CLI with valid API key
- WHEN the user runs `aleph campaign export <id>`
- THEN the export JSON is printed to stdout

### Scenario: Selective CLI export
- GIVEN a configured CLI with valid API key
- WHEN the user runs `aleph campaign export <id> --include entities,characters`
- THEN the output JSON contains only the specified resource types plus the campaign envelope

### Scenario: CLI export with invalid campaign ID
- GIVEN a configured CLI with valid API key
- WHEN the user runs `aleph campaign export nonexistent-id`
- THEN the CLI prints an error message indicating the campaign was not found
- AND the exit code is non-zero
