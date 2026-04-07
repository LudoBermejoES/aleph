## MODIFIED Requirements

### Requirement: Import Version Validation

The system SHALL reject import payloads that do not conform to the supported export format versions.

#### Scenario: Version 1.0 is accepted

- **WHEN** an authenticated user sends `POST /api/campaigns/import` with `Content-Type: application/json` and `version: "1.0"`
- **THEN** the response status is 201

#### Scenario: Version 1.1 is accepted

- **WHEN** an authenticated user sends `POST /api/campaigns/import` with `Content-Type: application/json` and `version: "1.1"`
- **THEN** the response status is 201

#### Scenario: Version 1.2 is accepted via ZIP upload

- **WHEN** an authenticated user sends `POST /api/campaigns/import` with `Content-Type: multipart/form-data` and a ZIP file whose `campaign.json` has `version: "1.2"`
- **THEN** the response status is 201

#### Scenario: Unsupported version in JSON body is rejected

- **WHEN** an authenticated user sends `POST /api/campaigns/import` with `Content-Type: application/json` and a `version` that is not `"1.0"` or `"1.1"`
- **THEN** the response status is 422
- **AND** the response body contains a message indicating the unsupported version

#### Scenario: Unsupported version inside ZIP is rejected

- **WHEN** an authenticated user uploads a ZIP whose `campaign.json` has an unsupported `version`
- **THEN** the response status is 422

#### Scenario: Missing version field is rejected

- **WHEN** an authenticated user sends `POST /api/campaigns/import` with a JSON body that has no `version` field
- **THEN** the response status is 422
