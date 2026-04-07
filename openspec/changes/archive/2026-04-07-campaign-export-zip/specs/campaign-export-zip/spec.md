## ADDED Requirements

### Requirement: Export returns a ZIP archive

The system SHALL export campaign data as a ZIP archive containing a `campaign.json` file and all referenced image files under an `images/` directory.

#### Scenario: Full export returns a ZIP file

- **WHEN** a DM sends `GET /api/campaigns/:id/export`
- **THEN** the response status is 200
- **AND** the `Content-Type` header is `application/zip`
- **AND** the `Content-Disposition` header contains `attachment` and a filename ending in `.zip` with the campaign slug and date

#### Scenario: ZIP contains campaign.json with version 1.2

- **WHEN** a DM exports a campaign
- **THEN** the ZIP archive contains an entry named `campaign.json`
- **AND** parsing `campaign.json` yields an object with `version` set to `"1.2"`
- **AND** `campaign.json` contains `exportedAt`, `generator`, and `campaign` fields
- **AND** `campaign.json` does NOT contain an `images` key

#### Scenario: ZIP contains image files for all referenced images

- **WHEN** a DM exports a campaign that has at least one entity with an uploaded image
- **THEN** the ZIP archive contains the image file under `images/{filename}`
- **AND** the image file bytes match the original uploaded file

#### Scenario: ZIP images directory is empty when campaign has no images

- **WHEN** a DM exports a campaign with no uploaded images
- **THEN** the ZIP archive contains `campaign.json`
- **AND** no `images/` entries are present in the archive

#### Scenario: Missing image file on disk is skipped without error

- **WHEN** an entity's `imageUrl` references a file that no longer exists on disk
- **THEN** the export succeeds with status 200
- **AND** no entry for the missing file appears in the ZIP

### Requirement: Import accepts a ZIP archive

The system SHALL accept a v1.2 ZIP export uploaded as `multipart/form-data` via `POST /api/campaigns/import`.

#### Scenario: Successful ZIP import

- **WHEN** an authenticated user sends `POST /api/campaigns/import` with `Content-Type: multipart/form-data` and a `file` field containing a valid v1.2 ZIP
- **THEN** the response status is 201
- **AND** the response body contains the new campaign `id`, `name`, and `slug`
- **AND** a new campaign exists in the database with all resources from `campaign.json`

#### Scenario: Image files are written to the new campaign's content directory

- **WHEN** a user imports a v1.2 ZIP containing image files under `images/`
- **THEN** each image file is written to `{newContentDir}/images/{filename}`
- **AND** entity `imageUrl` fields reference the new campaign ID
- **AND** character `portraitUrl` fields are rewritten to reference the new campaign ID

#### Scenario: ZIP import with name override via query parameter

- **WHEN** an authenticated user sends `POST /api/campaigns/import?name=Custom+Name` with a valid ZIP
- **THEN** the created campaign uses `"Custom Name"` as its name

#### Scenario: ZIP import with unsupported JSON version inside ZIP returns 422

- **WHEN** a user uploads a ZIP whose `campaign.json` has `version: "0.9"`
- **THEN** the response status is 422

#### Scenario: Malformed ZIP returns 422

- **WHEN** a user uploads a file that is not a valid ZIP archive
- **THEN** the response status is 422

#### Scenario: ZIP missing campaign.json returns 422

- **WHEN** a user uploads a ZIP that does not contain `campaign.json`
- **THEN** the response status is 422

### Requirement: CLI exports and imports ZIP files

The system SHALL update the CLI `campaign export` command to save `.zip` files and accept ZIP files for import.

#### Scenario: CLI export saves a .zip file

- **GIVEN** a configured CLI with a valid API key
- **WHEN** the user runs `aleph campaign export <id> --output export.zip`
- **THEN** the file `export.zip` is created as a valid ZIP archive containing `campaign.json`

#### Scenario: CLI export to stdout is not supported for ZIP

- **GIVEN** a configured CLI with a valid API key
- **WHEN** the user runs `aleph campaign export <id>` without `--output`
- **THEN** the CLI prints an error indicating that `--output` is required for ZIP exports

#### Scenario: CLI import accepts a .zip file

- **GIVEN** a configured CLI with a valid API key
- **WHEN** the user runs `aleph campaign import export.zip`
- **THEN** the ZIP is uploaded as multipart form data and a new campaign is created
