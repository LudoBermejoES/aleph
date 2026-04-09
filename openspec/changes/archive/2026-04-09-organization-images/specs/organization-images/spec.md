## ADDED Requirements

### Requirement: Organization imageUrl column

The organizations table SHALL have a nullable `imageUrl` text column for storing the URL path to the organization's image.

#### Scenario: New organization has null imageUrl

- **WHEN** a new organization is created without uploading an image
- **THEN** the `imageUrl` field is null

#### Scenario: Existing organizations unaffected by migration

- **WHEN** the migration runs on a database with existing organizations
- **THEN** all existing organizations have `imageUrl` set to null (no data loss)

---

### Requirement: Organization image upload endpoint

`POST /api/campaigns/:id/organizations/:slug/image` SHALL accept a multipart form upload with field name `image`, validate the file, store it, and update the organization's `imageUrl`.

#### Scenario: Upload valid PNG image

- **WHEN** an editor uploads a valid PNG image (under 10MB) to the endpoint
- **THEN** the image is stored in the campaign's content directory
- **AND** the organization's `imageUrl` is updated
- **AND** the response contains `{ imageUrl: "/api/campaigns/:id/organizations/:slug/image" }`

#### Scenario: Upload rejected for invalid MIME type

- **WHEN** a user uploads a file with MIME type `application/pdf`
- **THEN** the server returns 422 with an error message

#### Scenario: Upload rejected for oversized file

- **WHEN** a user uploads an image larger than 10MB
- **THEN** the server returns 422 with an error message

#### Scenario: Upload requires editor role

- **WHEN** a player attempts to upload an org image
- **THEN** the server returns 403

#### Scenario: Upload to non-existent organization

- **WHEN** a user uploads to a slug that doesn't exist
- **THEN** the server returns 404

---

### Requirement: Organization image serving endpoint

`GET /api/campaigns/:id/organizations/:slug/image` SHALL serve the organization's image with the correct Content-Type header.

#### Scenario: Serve uploaded image

- **WHEN** a client requests the org image endpoint after upload
- **THEN** the image is served with the correct Content-Type (image/png, image/jpeg, or image/webp)

#### Scenario: No image uploaded

- **WHEN** a client requests the image for an org with no image
- **THEN** the server returns 404

---

### Requirement: Organization GET returns imageUrl

The `GET /api/campaigns/:id/organizations/:slug` endpoint SHALL include `imageUrl` in its response.

#### Scenario: Org with image

- **WHEN** an organization has an uploaded image
- **THEN** the GET response includes `imageUrl` with the serving URL

#### Scenario: Org without image

- **WHEN** an organization has no image
- **THEN** the GET response includes `imageUrl: null`

---

### Requirement: Organization PUT accepts imageUrl

The `PUT /api/campaigns/:id/organizations/:slug` endpoint SHALL accept an optional `imageUrl` field.

#### Scenario: Clear org image via PUT

- **WHEN** an editor PUTs `{ imageUrl: null }` to an org
- **THEN** the org's imageUrl is set to null

---

### Requirement: Graph API includes org imageUrl

Organization nodes in the graph API response SHALL include the actual `imageUrl` instead of hardcoded null.

#### Scenario: Org with image in graph

- **WHEN** the graph API is called and an organization has an imageUrl
- **THEN** the org node's `image` field contains the imageUrl

---

### Requirement: Diagram factionCard shows org image

When creating factionCard shapes (in generator and client-side expansion), the org's `imageUrl` SHALL be passed as the `crestUrl` prop.

#### Scenario: Generated diagram shows org crest

- **WHEN** a faction-web diagram is generated for an org with an image
- **THEN** the factionCard shape has `crestUrl` set to the org's imageUrl

#### Scenario: Entity panel shows org image

- **WHEN** the entity panel searches for organizations
- **THEN** organizations with images show their imageUrl as `portraitUrl`

---

### Requirement: CLI organization upload-image command

The CLI SHALL support `organization upload-image <slug> --campaign <id> --file <path>` to upload an image for an organization.

#### Scenario: Upload image via CLI

- **WHEN** the user runs `aleph organization upload-image la-fuerza-oculta --campaign <id> --file logo.png`
- **THEN** the image is uploaded and the org's imageUrl is updated

#### Scenario: CLI error for missing file

- **WHEN** the user specifies a non-existent file path
- **THEN** the CLI shows an error message

---

### Requirement: CLI skill documentation updated

Both `docs/claude-skill.md` and `.claude/skills/aleph-cli/SKILL.md` SHALL document the new `organization upload-image` command.

#### Scenario: Skill docs include new command

- **WHEN** an AI agent reads the skill documentation
- **THEN** it finds the `organization upload-image` command with usage and parameters
