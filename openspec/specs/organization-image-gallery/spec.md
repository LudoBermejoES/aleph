# organization-image-gallery Specification

## Purpose

TBD - created by archiving change entity-image-gallery. Update Purpose after archive.

## Requirements

### Requirement: Organization image storage model

The system SHALL store organization images in the existing `entity_images` table, keyed by the
organization's `entityId`. The exactly-one-primary partial unique index applies to organizations
identically to locations. `organizations.imageUrl` SHALL be the derived mirror of the primary
image URL, updated inside every gallery mutation transaction.

#### Scenario: Image row created on upload

- **WHEN** an image is uploaded for an organization
- **THEN** an `entity_images` row is inserted with `entityId` set to the organization's entity id
- **AND** `organizations.imageUrl` is updated to the new image's URL if it is the primary

#### Scenario: Images are removed when the organization entity is deleted

- **WHEN** an organization entity row is deleted
- **THEN** all its `entity_images` rows are deleted by the foreign key cascade

#### Scenario: Images are removed when the campaign is deleted

- **WHEN** a campaign is deleted
- **THEN** all `entity_images` rows for organizations in that campaign are deleted by the cascade

### Requirement: List organization images

The system SHALL provide `GET /api/campaigns/:id/organizations/:slug/images` returning the
organization's images ordered by `sortOrder` ascending, `createdAt` ascending as the tiebreak.
Each item SHALL include `id`, `url`, `caption`, `sortOrder`, `isPrimary` and `createdAt`.
Minimum role: campaign member.

#### Scenario: Member lists an organization's images

- **GIVEN** an organization with three images
- **WHEN** an authenticated campaign member sends `GET /api/campaigns/:id/organizations/:slug/images`
- **THEN** the server returns HTTP 200 with an array of three items in `sortOrder` order
- **AND** exactly one item has `isPrimary: true`

#### Scenario: Empty gallery returns an empty array

- **GIVEN** an organization with no images
- **WHEN** the endpoint is called
- **THEN** the server returns HTTP 200 with `[]`

#### Scenario: Unauthenticated request is rejected

- **WHEN** an unauthenticated request is sent
- **THEN** the server returns HTTP 401

### Requirement: Upload an organization image

The system SHALL provide `POST /api/campaigns/:id/organizations/:slug/images` accepting a
multipart form upload (field name `image`) with an optional `caption` field. The system SHALL
validate MIME type by declared type and magic bytes, cap at 10 MB, and write the file to
`{campaign.contentDir}/organizations/{slug}/images/{imageId}.{ext}`. The first upload becomes
primary and sets `organizations.imageUrl`. Minimum role: `editor`.

#### Scenario: Editor uploads an image to an empty gallery

- **GIVEN** an organization with no images
- **WHEN** an authenticated editor uploads a valid PNG under 10 MB
- **THEN** the server returns HTTP 201 with `{ id, url, caption, sortOrder: 0, isPrimary: true }`
- **AND** `organizations.imageUrl` equals the returned `url`
- **AND** the file exists at `{contentDir}/organizations/{slug}/images/{id}.png`

#### Scenario: Second upload does not become primary

- **GIVEN** an organization that already has a primary image
- **WHEN** an editor uploads a second image
- **THEN** the new image has `isPrimary: false`
- **AND** `organizations.imageUrl` is unchanged

#### Scenario: Upload rejected for insufficient role

- **WHEN** an authenticated user with `player` or `visitor` role attempts to upload
- **THEN** the server returns HTTP 403

#### Scenario: Upload rejected for invalid MIME type

- **WHEN** a user uploads a file whose declared MIME type is not png, jpeg, or webp
- **THEN** the server returns HTTP 400 and no file is written

#### Scenario: Upload rejected when content does not match declared type

- **WHEN** a user uploads a file declared as `image/png` whose magic bytes are not PNG
- **THEN** the server returns HTTP 400

#### Scenario: Upload rejected for oversized file

- **WHEN** a user uploads an image larger than 10 MB
- **THEN** the server returns HTTP 400

### Requirement: Serve an organization image

The system SHALL provide `GET /api/campaigns/:id/organizations/:slug/images/:imageId` that
reads the file from disk and responds with the correct `Content-Type` and `Cache-Control:
public, max-age=31536000`. Minimum role: campaign member.

#### Scenario: Member retrieves an image

- **WHEN** an authenticated campaign member requests an existing image
- **THEN** the server responds with the image bytes, the correct `Content-Type`, and
  `Cache-Control: public, max-age=31536000`

#### Scenario: Unknown image id returns 404

- **WHEN** the `imageId` does not belong to the organization
- **THEN** the server returns HTTP 404

#### Scenario: Row present but file missing returns 404

- **GIVEN** an `entity_images` row whose file has been removed from disk
- **WHEN** the image is requested
- **THEN** the server returns HTTP 404

### Requirement: Choose the main organization image

The system SHALL provide `PATCH /api/campaigns/:id/organizations/:slug/images/:imageId`
accepting any of `caption`, `sortOrder`, and `isPrimary`. Setting `isPrimary: true` SHALL, in
a single transaction, clear `isPrimary` on every other image of that organization, set it on
the target, and update `organizations.imageUrl` to the target's URL. Minimum role: `editor`.

#### Scenario: Editor promotes a different image to primary

- **GIVEN** an organization whose primary image is A and which also has image B
- **WHEN** an editor sends `PATCH .../images/<B>` with `{ isPrimary: true }`
- **THEN** the server returns HTTP 200 with B marked primary
- **AND** `organizations.imageUrl` equals B's URL

#### Scenario: Setting isPrimary false is rejected on a non-empty gallery

- **WHEN** an editor sends `{ isPrimary: false }` for the current primary
- **THEN** the server returns HTTP 400

#### Scenario: Editor edits a caption

- **WHEN** an editor sends `{ caption: "Faction banner, winter 1923" }`
- **THEN** the server returns HTTP 200 and a subsequent list shows the new caption

#### Scenario: Player cannot modify an image

- **WHEN** an authenticated user with `player` or `visitor` role sends a PATCH
- **THEN** the server returns HTTP 403

### Requirement: Delete an organization image

The system SHALL provide `DELETE /api/campaigns/:id/organizations/:slug/images/:imageId` that
removes the row, unlinks the file, and returns 204. When the deleted image was the primary and
other images remain, the system SHALL promote the lowest-`sortOrder` survivor to primary in the
same transaction and update `organizations.imageUrl`. Minimum role: `editor`.

#### Scenario: Editor deletes a non-primary image

- **WHEN** an editor deletes an image that is not primary
- **THEN** the server returns HTTP 204 and `organizations.imageUrl` is unchanged

#### Scenario: Deleting the primary promotes the next image

- **GIVEN** an organization whose primary is A, with surviving image B
- **WHEN** an editor deletes A
- **THEN** B becomes primary and `organizations.imageUrl` equals B's URL

#### Scenario: Deleting the last image clears imageUrl

- **GIVEN** an organization with exactly one image
- **WHEN** an editor deletes it
- **THEN** the gallery is empty and `organizations.imageUrl` is `null`

#### Scenario: Player cannot delete an image

- **WHEN** an authenticated user with `player` or `visitor` role sends a DELETE
- **THEN** the server returns HTTP 403

### Requirement: The primary image is mirrored to organizations.imageUrl

The system SHALL keep `organizations.imageUrl` equal to the URL of the organization's primary
gallery image, or `null` when the gallery is empty. This synchronisation SHALL be performed
inside the transaction of every gallery mutation.

#### Scenario: Every mutation leaves the mirror consistent

- **WHEN** an image is uploaded, promoted to primary, or deleted
- **THEN** `organizations.imageUrl` equals the URL of the row with `isPrimary = 1`, or `null`
  if no such row exists

### Requirement: Existing image.post.ts is adapted for gallery

The existing `POST /api/campaigns/:id/organizations/:slug/image` route SHALL be adapted to
create or replace the **primary** gallery image rather than writing `image.{ext}` and setting
`imageUrl` directly. The response shape is unchanged so existing callers need no modification.

#### Scenario: Uploading via the old route creates a gallery row

- **WHEN** a caller posts to `image` for an organization with an empty gallery
- **THEN** an `entity_images` row is created with `isPrimary: true`
- **AND** `organizations.imageUrl` equals the new gallery image's URL

#### Scenario: Uploading via the old route replaces the primary for an existing gallery

- **GIVEN** an organization with a gallery of two images, primary image A
- **WHEN** a caller posts to `image`
- **THEN** the new image becomes primary
- **AND** images A and B remain in the gallery with `isPrimary: false`

### Requirement: Backfill existing organization images into the gallery

A one-time migration SHALL create a gallery row for every organization that already has a
non-null `organizations.imageUrl`, marked primary with `sortOrder` 0, copying the existing
image file into the new layout. The migration SHALL be idempotent.

#### Scenario: Existing image becomes the primary gallery image

- **GIVEN** an organization whose `imageUrl` is non-null and whose file exists on disk
- **WHEN** the migration runs
- **THEN** the organization has exactly one gallery image, marked primary
- **AND** `organizations.imageUrl` is updated to the new gallery URL

#### Scenario: Migration is idempotent

- **WHEN** the migration runs a second time
- **THEN** no duplicate gallery rows are created

#### Scenario: Organization without an image is untouched

- **GIVEN** an organization whose `imageUrl` is `null`
- **WHEN** the migration runs
- **THEN** it has no gallery rows and `imageUrl` remains `null`

#### Scenario: Missing source file does not abort the migration

- **GIVEN** an organization whose `imageUrl` points at a file that no longer exists
- **WHEN** the migration runs
- **THEN** the migration completes for all other organizations without error

### Requirement: Organization gallery on the detail page

The organization detail page SHALL display an Images panel showing the organization's images
in gallery order, with each image's caption beneath it and the primary image visually marked.
The panel SHALL be hidden when the gallery is empty and the viewer cannot edit.

#### Scenario: Member sees the gallery

- **GIVEN** an organization with images
- **WHEN** a campaign member opens the organization detail page
- **THEN** an Images panel renders all images in gallery order with their captions

#### Scenario: Empty gallery offers upload to an editor

- **GIVEN** an organization with no images
- **WHEN** an `editor` opens the detail page
- **THEN** an Images panel is rendered with an upload control

#### Scenario: Empty gallery is hidden from a player

- **GIVEN** an organization with no images
- **WHEN** a `player` opens the detail page
- **THEN** no Images panel is rendered

### Requirement: Organization gallery management

An editor or above SHALL be able to upload, caption, reorder, promote to primary, and delete
images from the organization detail and edit pages, with the panel updating in place.

#### Scenario: Editor uploads from the gallery panel

- **WHEN** an editor picks a file in the Images panel
- **THEN** the new image appears in the grid on success

#### Scenario: Editor sets the main image

- **WHEN** an editor clicks the set-primary control on a non-primary image
- **THEN** the primary marker moves and the organization's header image updates without a reload

#### Scenario: Gallery strings are translated

- **WHEN** the UI is viewed in `en` or `es`
- **THEN** every gallery label, button, and error uses a key present in both locale files

### Requirement: aleph-cli manages organization images

The aleph-cli SHALL expose organization gallery commands: `organization images <slug>` to list,
`organization image-add <slug> --file <path> [--caption <text>]` to upload, `organization
image-update <slug> <imageId> [--caption <text>] [--order <n>]`, `organization image-set-primary
<slug> <imageId>`, and `organization image-remove <slug> <imageId>`. Both skill files SHALL
document them with a `version` bump.

#### Scenario: CLI lists an organization's images

- **WHEN** a user runs `aleph organization images <slug> --campaign <id>`
- **THEN** the images are printed in gallery order with ids, captions, and a primary marker

#### Scenario: CLI uploads an organization image

- **WHEN** a user runs `aleph organization image-add <slug> --campaign <id> --file banner.png`
- **THEN** the image is uploaded and the new image's id and URL are printed

#### Scenario: CLI sets the main image

- **WHEN** a user runs `aleph organization image-set-primary <slug> <imageId> --campaign <id>`
- **THEN** that image becomes primary and the change is confirmed on stdout

#### Scenario: Both skill files stay in step

- **WHEN** the CLI organization image commands are added
- **THEN** `docs/claude-skill.md` and `.claude/skills/aleph-cli/SKILL.md` both document the
  same command surface
