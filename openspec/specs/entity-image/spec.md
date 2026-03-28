## ADDED Requirements

### Requirement: Entity image database field
The `entities` table SHALL have an optional `imageUrl` text column (nullable, no default). When an image is uploaded, this column stores the API URL path for serving the image.

#### Scenario: New entity has no image by default
- **WHEN** a new entity is created
- **THEN** the `imageUrl` column is `null`

#### Scenario: Image URL is set after upload
- **WHEN** an image is uploaded for an entity
- **THEN** the `imageUrl` column is set to `/api/campaigns/{campaignId}/entities/{slug}/image`

### Requirement: Upload entity image via API
The system SHALL provide a `POST /api/campaigns/:id/entities/:slug/image` endpoint that accepts a multipart form upload (field name `image`), validates MIME type and file size, stores the file at `{campaign.contentDir}/entities/{entitySlug}/image.{ext}`, updates the entity's `imageUrl` column, and returns `{ imageUrl }`. Minimum role: `editor`.

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
- **WHEN** an entity already has an image and a new image is uploaded
- **THEN** the old file is replaced and the `imageUrl` column remains the same URL path

#### Scenario: Upload for non-existent entity returns 404
- **WHEN** the entity slug does not exist in the campaign
- **THEN** the server returns HTTP 404

### Requirement: Serve entity image via API
The system SHALL provide a `GET /api/campaigns/:id/entities/:slug/image` endpoint that reads the image file from disk and responds with the correct `Content-Type` header and caching headers. Minimum role: campaign member (any role).

#### Scenario: Member retrieves an entity image
- **WHEN** an authenticated campaign member sends a GET request
- **THEN** the server responds with the image bytes, correct `Content-Type`, and `Cache-Control: public, max-age=3600`

#### Scenario: Image not found returns 404
- **WHEN** the entity exists but has no uploaded image
- **THEN** the server returns HTTP 404

#### Scenario: Entity not found returns 404
- **WHEN** the entity slug does not exist
- **THEN** the server returns HTTP 404

#### Scenario: Unauthenticated request is rejected
- **WHEN** an unauthenticated request is sent
- **THEN** the server returns HTTP 401

### Requirement: EntityImage Vue component
The system SHALL provide an `EntityImage.vue` component that displays an entity's image or a placeholder, with optional upload support.

#### Scenario: Image displayed when URL is provided
- **WHEN** the component receives a non-null `imageUrl` prop
- **THEN** it renders an `<img>` element with the URL as `src`

#### Scenario: Placeholder shown when no image
- **WHEN** the component receives a null `imageUrl` prop
- **THEN** it renders a placeholder with a generic image icon (lucide `ImageIcon`)

#### Scenario: Editable mode allows upload
- **WHEN** the `editable` prop is `true`
- **THEN** clicking the image or placeholder opens a file picker; selecting a file uploads it to the entity image endpoint

#### Scenario: Upload progress indicator
- **WHEN** an upload is in progress
- **THEN** the component shows a loading overlay

#### Scenario: Size variants
- **WHEN** the `size` prop is `sm`, `md`, or `lg`
- **THEN** the component renders at `w-10 h-10`, `w-24 h-24`, or `w-48 h-48` respectively

### Requirement: Entity detail page displays image
The entity detail page (`app/pages/campaigns/[id]/entities/[slug]/index.vue`) SHALL display the entity's image using the `EntityImage` component when the entity has an `imageUrl`.

#### Scenario: Entity with image shows it on detail page
- **WHEN** viewing an entity that has an uploaded image
- **THEN** the `EntityImage` component is rendered at `lg` size

#### Scenario: Editable when user has editor role
- **WHEN** the current user has `editor` role or above
- **THEN** the `EntityImage` component is in editable mode (allows upload)

### Requirement: Entity list shows image thumbnails
The entity list page (`app/pages/campaigns/[id]/entities/index.vue`) SHALL show a small image thumbnail for entities that have an `imageUrl`.

#### Scenario: Entity with image shows thumbnail in list
- **WHEN** viewing the entity list and an entity has an `imageUrl`
- **THEN** a `sm` size `EntityImage` is rendered next to the entity name

#### Scenario: Entity without image shows no thumbnail
- **WHEN** an entity has no `imageUrl`
- **THEN** no image or placeholder is shown in the list (clean layout)

### Requirement: Entity edit page allows image upload
The entity edit page (`app/pages/campaigns/[id]/entities/[slug]/edit.vue`) SHALL include an `EntityImage` component in editable mode.

#### Scenario: Editor can upload image from edit page
- **WHEN** an editor visits the entity edit page
- **THEN** an `EntityImage` component in editable mode is shown, allowing image upload

### Requirement: Entity image returned in API responses
The entity detail API (`GET /api/campaigns/:id/entities/:slug`) and entity list API (`GET /api/campaigns/:id/entities`) SHALL include the `imageUrl` field in their responses.

#### Scenario: Detail API includes imageUrl
- **WHEN** a client requests entity details
- **THEN** the response includes `imageUrl` (string or null)

#### Scenario: List API includes imageUrl
- **WHEN** a client requests the entity list
- **THEN** each entity object includes `imageUrl` (string or null)
