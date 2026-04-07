## ADDED Requirements

### Requirement: Import Campaign from Export JSON

The system SHALL accept a valid Aleph campaign export JSON via `POST /api/campaigns/import` and create a fully populated new campaign, remapping all internal IDs to new values and reconstructing all cross-resource relationships.

#### Scenario: Successful full import

- **WHEN** an authenticated user sends `POST /api/campaigns/import` with a valid v1.0 export JSON body
- **THEN** the response status is 201
- **AND** the response body contains the new campaign `id`, `name`, and `slug`
- **AND** a new campaign exists in the database with all resources intact (entities, sessions, maps, etc.)
- **AND** the authenticated user is assigned the `dm` role on the new campaign

#### Scenario: All IDs are remapped — no collisions with originals

- **WHEN** a valid export is imported
- **THEN** the new campaign's resource IDs are all different from the original export's IDs
- **AND** all foreign key references within the new campaign consistently point to the new IDs

#### Scenario: Import with name override via query parameter

- **WHEN** an authenticated user sends `POST /api/campaigns/import?name=My+Custom+Name` with a valid export JSON
- **THEN** the created campaign uses `"My Custom Name"` as its name instead of the name in the export

#### Scenario: Import with duplicate campaign name appends suffix

- **WHEN** an authenticated user imports a campaign whose name already exists for that user
- **AND** no `?name=` override is provided
- **THEN** the imported campaign name is suffixed with ` (imported YYYY-MM-DD)`
- **AND** the response status is 201

#### Scenario: Partial export (missing resource types) imports gracefully

- **WHEN** a valid export JSON is imported that omits some resource type arrays (e.g. no `maps`, no `timelines`)
- **THEN** the import succeeds with status 201
- **AND** only the present resource types are inserted
- **AND** no error is returned for absent resource types

#### Scenario: Members are not imported

- **WHEN** a valid export containing a `members` array is imported
- **THEN** the `members` array is silently ignored
- **AND** only the importing user is added as `dm` of the new campaign

---

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

#### Scenario: Image URL fields are rewritten on import of v1.1 exports

- **WHEN** a user imports a `"1.1"` export containing embedded images
- **THEN** entity `imageUrl` fields in the imported records reference `/api/campaigns/{newId}/images/{filename}`
- **AND** character `portraitUrl` fields are rewritten similarly
- **AND** sessionGroup, map, mapLayer, and item image fields are rewritten similarly

#### Scenario: 1.0 export imports successfully without image restoration

- **WHEN** a user imports a `"1.0"` export (no `images` key)
- **THEN** the import succeeds with status 201
- **AND** image URL fields in the imported records retain their original values
- **AND** no error is returned

#### Scenario: Missing campaign envelope is rejected

- **WHEN** an authenticated user sends `POST /api/campaigns/import` with a JSON body that has no `campaign` object
- **THEN** the response status is 422

#### Scenario: Non-JSON body is rejected

- **WHEN** an authenticated user sends `POST /api/campaigns/import` with a non-JSON body
- **THEN** the response status is 400

---

### Requirement: Import Authorization

The system SHALL require authentication to import a campaign. Any authenticated user may import.

#### Scenario: Authenticated user can import

- **WHEN** an authenticated user (any role, or no existing campaigns) sends a valid import request
- **THEN** the response status is 201

#### Scenario: Unauthenticated request is rejected

- **WHEN** a request is sent to `POST /api/campaigns/import` with no session cookie and no API key
- **THEN** the response status is 401

#### Scenario: API key authentication works for import

- **WHEN** a request is sent to `POST /api/campaigns/import` with a valid `X-API-Key` header and a valid export body
- **THEN** the response status is 201

---

### Requirement: Import Atomicity

The system SHALL import all resources in a single database transaction; if any insertion fails the entire import is rolled back.

#### Scenario: Failed insertion rolls back entire import

- **WHEN** an import payload causes a database constraint violation on any resource (e.g. malformed field)
- **THEN** the response status is 500 (or 422 if validation catches it first)
- **AND** no partial campaign or resources are left in the database

---

### Requirement: Frontend Import Button

The system SHALL provide an "Import Campaign" button on the campaigns list page that allows any authenticated user to upload a campaign export JSON file and trigger an import.

#### Scenario: Import button is visible on campaigns list

- **WHEN** an authenticated user visits `/campaigns`
- **THEN** an "Import Campaign" button is visible on the page

#### Scenario: Clicking Import opens a file picker

- **WHEN** the user clicks the "Import Campaign" button
- **THEN** a file input dialog opens accepting `.json` files

#### Scenario: Selecting a valid file triggers import and redirects

- **WHEN** the user selects a valid campaign export `.json` file
- **THEN** the file is read and posted to `POST /api/campaigns/import`
- **AND** on success the user is redirected to the new campaign's page
- **AND** a success notification is shown

#### Scenario: Import error shows user-facing message

- **WHEN** the import request returns an error (4xx or 5xx)
- **THEN** an error notification is shown with the error message
- **AND** the user remains on the campaigns list page

#### Scenario: Import shows loading state while in progress

- **WHEN** the user selects a file and the import is in progress
- **THEN** the Import button shows a loading/spinner state and is disabled

---

### Requirement: CLI Import Command

The system SHALL provide a `aleph campaign import <file>` CLI command that reads a campaign export JSON file and posts it to the import endpoint.

#### Scenario: Importing a campaign from a file

- **WHEN** the user runs `aleph campaign import ./campaign-export.json`
- **THEN** the CLI reads the file and posts it to `POST /api/campaigns/import`
- **AND** on success prints the new campaign ID and name
- **AND** exits with code 0

#### Scenario: Import with name override

- **WHEN** the user runs `aleph campaign import ./export.json --name "My Imported Campaign"`
- **THEN** the CLI appends `?name=My+Imported+Campaign` to the request
- **AND** the created campaign uses the specified name

#### Scenario: File not found

- **WHEN** the user runs `aleph campaign import ./nonexistent.json`
- **THEN** the CLI prints an error indicating the file was not found
- **AND** exits with a non-zero code

#### Scenario: Import returns an error from the server

- **WHEN** the server returns a 422 or 500 error during import
- **THEN** the CLI prints the error message from the response
- **AND** exits with a non-zero code

#### Scenario: Unauthenticated CLI import is rejected

- **WHEN** the user runs `aleph campaign import ./export.json` with no configured API key
- **THEN** the CLI prints an authentication error
- **AND** exits with a non-zero code
