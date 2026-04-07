## MODIFIED Requirements

### Requirement: Import Version Validation

The system SHALL reject import payloads that do not conform to the supported export format versions.

#### Scenario: Version 1.0 is accepted

- **WHEN** an authenticated user sends `POST /api/campaigns/import` with `version: "1.0"`
- **THEN** the response status is 201

#### Scenario: Version 1.1 is accepted

- **WHEN** an authenticated user sends `POST /api/campaigns/import` with `version: "1.1"`
- **THEN** the response status is 201

#### Scenario: Unsupported version is rejected

- **WHEN** an authenticated user sends `POST /api/campaigns/import` with a `version` that is not `"1.0"` or `"1.1"`
- **THEN** the response status is 422
- **AND** the response body contains a message indicating the unsupported version

#### Scenario: Missing version field is rejected

- **WHEN** an authenticated user sends `POST /api/campaigns/import` with a JSON body that has no `version` field
- **THEN** the response status is 422
