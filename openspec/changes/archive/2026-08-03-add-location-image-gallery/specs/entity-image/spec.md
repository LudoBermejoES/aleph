## MODIFIED Requirements

### Requirement: Upload entity image via API

The system SHALL provide a `POST /api/campaigns/:id/entities/:slug/image` endpoint that accepts a multipart form upload (field name `image`), validates MIME type and file size, stores the file at `{campaign.contentDir}/entities/{entitySlug}/image.{ext}`, updates the entity's `imageUrl` column, and returns `{ imageUrl }`. Minimum role: `editor`.

When the target entity has `type = 'location'`, the endpoint SHALL instead delegate to the location image gallery: it creates a gallery image, marks it primary (replacing any previous primary), and lets the gallery service set `entities.imageUrl`. It SHALL NOT write `entities/{slug}/image.{ext}` and SHALL NOT write `entities.imageUrl` directly. This keeps a single writer for the primary-image mirror; behaviour for every other entity type is unchanged.

#### Scenario: Editor uploads a valid image

- **WHEN** an authenticated user with `editor` role or above sends a POST request with a valid PNG, JPEG, or WebP file under 10 MB
- **THEN** the server returns HTTP 200 with `{ imageUrl: "/api/campaigns/:id/entities/:slug/image" }` and the file is written to disk

#### Scenario: Upload rejected for invalid MIME type

- **WHEN** a user uploads a file with a MIME type other than `image/png`, `image/jpeg`, or `image/webp`
- **THEN** the server returns HTTP 400 with a descriptive error message and no file is written

#### Scenario: Upload rejected for oversized file

- **WHEN** a user uploads an image larger than 10 MB
- **THEN** the server returns HTTP 400 with a message indicating the size limit

#### Scenario: Upload rejected for insufficient role

- **WHEN** an authenticated user with `player` or `visitor` role attempts to upload
- **THEN** the server returns HTTP 403

#### Scenario: Upload rejected for unauthenticated request

- **WHEN** an unauthenticated request is sent
- **THEN** the server returns HTTP 401

#### Scenario: Upload overwrites previous image

- **WHEN** a non-location entity already has an image and a new image is uploaded
- **THEN** the old file is replaced and the `imageUrl` column remains the same URL path

#### Scenario: Upload for non-existent entity returns 404

- **WHEN** the entity slug does not exist in the campaign
- **THEN** the server returns HTTP 404

#### Scenario: Upload for a location creates a gallery image

- **GIVEN** an entity with `type = 'location'` and an empty gallery
- **WHEN** an editor uploads a valid image through `POST /api/campaigns/:id/entities/:slug/image`
- **THEN** the server returns HTTP 200 with `{ imageUrl }` pointing at the gallery serve URL
- **AND** `GET /api/campaigns/:id/locations/:slug/images` returns exactly one image, marked primary
- **AND** no file is written to `{contentDir}/entities/{slug}/image.{ext}`

#### Scenario: Upload for a location with an existing gallery replaces only the primary

- **GIVEN** a location with images A (primary) and B
- **WHEN** an editor uploads a new image C through the entity image endpoint
- **THEN** C is added to the gallery and marked primary
- **AND** A and B both still exist in the gallery, with A no longer primary
- **AND** `entities.imageUrl` equals C's URL
