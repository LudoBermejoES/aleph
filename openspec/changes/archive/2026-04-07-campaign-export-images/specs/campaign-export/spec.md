## MODIFIED Requirements

### Requirement: Full Campaign JSON Export

The system SHALL export all campaign data as a single JSON file via an API endpoint.

#### Scenario: Exporting a full campaign as JSON

- **WHEN** a user with the `dm` role sends `GET /api/campaigns/:id/export`
- **THEN** the response has `Content-Type: application/json`
- **AND** the response has a `Content-Disposition` header with a filename containing the campaign slug and date
- **AND** the JSON body contains a `version` field set to `"1.1"`
- **AND** the JSON body contains an `exportedAt` ISO timestamp
- **AND** the JSON body contains a `campaign` object with the campaign metadata
- **AND** the JSON body contains arrays for all resource types
- **AND** the JSON body contains a top-level `images` object (may be empty)
