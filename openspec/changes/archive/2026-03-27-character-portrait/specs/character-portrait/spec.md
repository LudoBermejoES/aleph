## ADDED Requirements

### Requirement: Upload character portrait
The system SHALL allow editors and DMs to upload a portrait image for a character via `POST /api/campaigns/[id]/characters/[slug]/portrait`. Accepted formats: PNG, JPEG, WebP. Maximum size: 10 MB. Uploading a new portrait SHALL overwrite the previous one.

#### Scenario: Editor uploads a portrait successfully
- **WHEN** an authenticated editor sends a multipart POST with a valid PNG to `/api/campaigns/<id>/characters/<slug>/portrait`
- **THEN** the server responds 200 with `{ portraitUrl: "/api/campaigns/<id>/characters/<slug>/portrait" }` and the file is stored on disk

#### Scenario: Upload rejected for invalid file type
- **WHEN** an authenticated editor sends a file with MIME type `image/gif`
- **THEN** the server responds 400 with an error message

#### Scenario: Upload rejected when file exceeds 10 MB
- **WHEN** an authenticated editor sends a file larger than 10 MB
- **THEN** the server responds 400 with a size limit error

#### Scenario: Visitor cannot upload portrait
- **WHEN** a visitor sends a POST to the portrait endpoint
- **THEN** the server responds 403

#### Scenario: Unauthenticated request is rejected
- **WHEN** a request with no API key or session is sent to the portrait endpoint
- **THEN** the server responds 401

### Requirement: Serve character portrait
The system SHALL serve the portrait image via `GET /api/campaigns/[id]/characters/[slug]/portrait` with the correct Content-Type header. Campaign visibility rules apply.

#### Scenario: Portrait is returned for a character that has one
- **WHEN** a campaign member requests the portrait of a character that has an uploaded portrait
- **THEN** the server responds 200 with the image bytes and correct Content-Type

#### Scenario: 404 when no portrait exists
- **WHEN** a request is made for a character with no portrait
- **THEN** the server responds 404

### Requirement: Portrait URL in character API responses
The system SHALL include `portraitUrl` in the response of `GET /api/campaigns/[id]/characters/[slug]` and in the character list endpoint. `portraitUrl` SHALL be `null` when no portrait has been uploaded.

#### Scenario: Character with portrait returns portraitUrl
- **WHEN** a member fetches a character that has a portrait
- **THEN** the response includes `portraitUrl: "/api/campaigns/<id>/characters/<slug>/portrait"`

#### Scenario: Character without portrait returns null portraitUrl
- **WHEN** a member fetches a character with no portrait
- **THEN** the response includes `portraitUrl: null`

### Requirement: Character portrait display in web UI
The system SHALL display the character portrait on the character detail page. Editors and DMs SHALL see an upload button. All members SHALL see the portrait if one exists, or a placeholder silhouette if not.

#### Scenario: Portrait displayed on character detail page
- **WHEN** a member visits the character detail page for a character with a portrait
- **THEN** the portrait image is visible on the page

#### Scenario: Upload button visible for editor
- **WHEN** an editor visits the character detail page
- **THEN** an upload button is present on the portrait area

#### Scenario: Upload button hidden for player/visitor
- **WHEN** a player or visitor visits the character detail page
- **THEN** no upload button is visible

#### Scenario: Placeholder shown when no portrait
- **WHEN** a member visits the character detail page for a character without a portrait
- **THEN** a silhouette placeholder is displayed in place of the portrait

### Requirement: Portrait thumbnail in character list
The system SHALL display a small portrait thumbnail next to each character name in the character list. Characters without a portrait SHALL show a placeholder avatar.

#### Scenario: Thumbnail visible in character list
- **WHEN** a member views the character list and a character has a portrait
- **THEN** a thumbnail of the portrait appears next to the character name

### Requirement: CLI portrait upload
The system SHALL provide `aleph character upload-portrait --campaign <id> --slug <slug> --file <path>` to upload a local image file as a character portrait.

#### Scenario: Successful CLI portrait upload
- **WHEN** the user runs `aleph character upload-portrait --campaign <id> --slug <slug> --file ./portrait.png` with a valid PNG
- **THEN** the CLI outputs a success message with the portrait URL

#### Scenario: CLI upload fails with missing file
- **WHEN** the user specifies a `--file` path that does not exist
- **THEN** the CLI outputs an error and exits with a non-zero code
