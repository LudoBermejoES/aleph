## ADDED Requirements

### Requirement: Location image storage model

The system SHALL store location images in an `entity_images` table, one row per image, with
columns `id`, `campaignId` (FK → `campaigns.id`, cascade delete), `entityId` (FK → `entities.id`,
cascade delete), `filename`, `url`, `caption` (nullable), `sortOrder` (integer, default `0`),
`isPrimary` (boolean, default `false`), `createdBy` (FK → `user.id`) and `createdAt`. The table
SHALL carry a partial unique index on `entityId` where `isPrimary = 1`, so that at most one image
per location can be primary.

#### Scenario: Image row created on upload

- **WHEN** an image is uploaded for a location
- **THEN** an `entity_images` row is inserted with `entityId` set to the location's entity id and
  `campaignId` set to the location's campaign

#### Scenario: A second primary is rejected by the database

- **GIVEN** a location with an image already marked `isPrimary = 1`
- **WHEN** a second row for the same `entityId` is written with `isPrimary = 1` outside the
  set-primary transaction
- **THEN** the write fails with a unique constraint violation on `entity_images_one_primary`

#### Scenario: Images are removed when the location is deleted

- **WHEN** a location entity row is deleted
- **THEN** all its `entity_images` rows are deleted by the foreign key cascade

#### Scenario: Images are removed when the campaign is deleted

- **WHEN** a campaign is deleted
- **THEN** all `entity_images` rows for that campaign are deleted by the foreign key cascade

### Requirement: List location images

The system SHALL provide `GET /api/campaigns/:id/locations/:slug/images` returning the location's
images ordered by `sortOrder` ascending, with `createdAt` ascending as the tiebreak. Each item
SHALL include `id`, `url`, `caption`, `sortOrder`, `isPrimary` and `createdAt`. Minimum role:
campaign member with read access to the location.

#### Scenario: Member lists a location's images

- **GIVEN** a location with three images
- **WHEN** an authenticated campaign member sends `GET /api/campaigns/:id/locations/:slug/images`
- **THEN** the server returns HTTP 200 with an array of three items in `sortOrder` order
- **AND** exactly one item has `isPrimary: true`

#### Scenario: Empty gallery returns an empty array

- **GIVEN** a location with no images
- **WHEN** the endpoint is called
- **THEN** the server returns HTTP 200 with `[]`, not 404

#### Scenario: Deterministic order when sortOrder ties

- **GIVEN** two images with the same `sortOrder`
- **WHEN** the endpoint is called twice
- **THEN** both responses list them in the same order, oldest `createdAt` first

#### Scenario: Location the caller cannot see returns 404

- **GIVEN** a location whose visibility excludes the caller
- **WHEN** the caller lists its images
- **THEN** the server returns HTTP 404, not 403, matching the location read path

#### Scenario: Unauthenticated request is rejected

- **WHEN** an unauthenticated request is sent
- **THEN** the server returns HTTP 401

### Requirement: Upload a location image

The system SHALL provide `POST /api/campaigns/:id/locations/:slug/images` accepting a multipart
form upload (field name `image`) with an optional `caption` field. The system SHALL validate the
declared MIME type against `image/png`, `image/jpeg` and `image/webp`, SHALL verify the actual
file content with a magic-byte check, and SHALL reject files over 10 MB. The file SHALL be written
to `{campaign.contentDir}/locations/{slug}/images/{imageId}.{ext}`. The new image SHALL be
appended with `sortOrder` one greater than the current maximum. Minimum role: `editor`.

#### Scenario: Editor uploads an image to an empty gallery

- **GIVEN** a location with no images
- **WHEN** an authenticated `editor` uploads a valid PNG under 10 MB
- **THEN** the server returns HTTP 201 with `{ id, url, caption, sortOrder: 0, isPrimary: true }`
- **AND** the file exists at `{contentDir}/locations/{slug}/images/{id}.png`
- **AND** the location's `entities.imageUrl` equals the returned `url`

#### Scenario: Second upload does not become primary

- **GIVEN** a location that already has a primary image
- **WHEN** an editor uploads a second image
- **THEN** the new image has `isPrimary: false` and `sortOrder` greater than the existing image's
- **AND** the location's `entities.imageUrl` is unchanged

#### Scenario: Upload with a caption

- **WHEN** an editor uploads an image with a `caption` form field
- **THEN** the returned image has that caption

#### Scenario: Two uploads of the same filename both survive

- **WHEN** an editor uploads `map.png` twice
- **THEN** both images exist with distinct ids and distinct files on disk
- **AND** neither upload overwrites the other

#### Scenario: Upload rejected for invalid MIME type

- **WHEN** a user uploads a file whose declared MIME type is not png, jpeg or webp
- **THEN** the server returns HTTP 400 and no file is written

#### Scenario: Upload rejected when content does not match declared type

- **WHEN** a user uploads a file declared as `image/png` whose magic bytes are not PNG
- **THEN** the server returns HTTP 400 and no file is written

#### Scenario: Upload rejected for oversized file

- **WHEN** a user uploads an image larger than 10 MB
- **THEN** the server returns HTTP 400 with a message indicating the size limit

#### Scenario: Upload rejected for insufficient role

- **WHEN** an authenticated user with `player` or `visitor` role attempts to upload
- **THEN** the server returns HTTP 403

#### Scenario: Unauthenticated upload is rejected

- **WHEN** an unauthenticated request is sent
- **THEN** the server returns HTTP 401

#### Scenario: Upload to a non-existent location returns 404

- **WHEN** the location slug does not exist in the campaign
- **THEN** the server returns HTTP 404

### Requirement: Serve a location image

The system SHALL provide `GET /api/campaigns/:id/locations/:slug/images/:imageId` that reads the
file from disk and responds with the matching `Content-Type` and `Cache-Control: public,
max-age=31536000`. Minimum role: campaign member with read access to the location.

#### Scenario: Member retrieves an image

- **WHEN** an authenticated campaign member requests an existing image
- **THEN** the server responds with the image bytes, the correct `Content-Type`, and
  `Cache-Control: public, max-age=31536000`

#### Scenario: Unknown image id returns 404

- **WHEN** the `imageId` does not belong to the location
- **THEN** the server returns HTTP 404

#### Scenario: Row present but file missing returns 404

- **GIVEN** an `entity_images` row whose file has been removed from disk
- **WHEN** the image is requested
- **THEN** the server returns HTTP 404 rather than a 500

#### Scenario: Unauthenticated request is rejected

- **WHEN** an unauthenticated request is sent
- **THEN** the server returns HTTP 401

### Requirement: Choose the main image

The system SHALL provide `PATCH /api/campaigns/:id/locations/:slug/images/:imageId` accepting any
of `caption`, `sortOrder` and `isPrimary`. Setting `isPrimary: true` SHALL, in a single
transaction, clear `isPrimary` on every other image of that location, set it on the target, and
update the location's `entities.imageUrl` to the target's URL. Minimum role: `editor`.

#### Scenario: Editor promotes a different image to primary

- **GIVEN** a location whose primary image is A and which also has image B
- **WHEN** an editor sends `PATCH .../images/<B>` with `{ isPrimary: true }`
- **THEN** the server returns HTTP 200 with B marked primary
- **AND** a subsequent list shows A with `isPrimary: false` and B with `isPrimary: true`
- **AND** the location's `entities.imageUrl` equals B's URL

#### Scenario: Setting isPrimary false is rejected on a non-empty gallery

- **WHEN** an editor sends `{ isPrimary: false }` for the current primary image
- **THEN** the server returns HTTP 400, because a non-empty gallery always has exactly one primary

#### Scenario: Editor edits a caption

- **WHEN** an editor sends `{ caption: "The cellar door" }`
- **THEN** the server returns HTTP 200 and a subsequent list shows the new caption
- **AND** `isPrimary` and `sortOrder` are unchanged

#### Scenario: Editor reorders an image

- **WHEN** an editor sends `{ sortOrder: 0 }` for an image that was last
- **THEN** a subsequent list returns that image first

#### Scenario: Image id from another location is rejected

- **WHEN** the `imageId` belongs to a different location
- **THEN** the server returns HTTP 404 and no row is modified

#### Scenario: Player cannot modify an image

- **WHEN** an authenticated user with `player` or `visitor` role sends a PATCH
- **THEN** the server returns HTTP 403

#### Scenario: Unauthenticated PATCH is rejected

- **WHEN** an unauthenticated request is sent
- **THEN** the server returns HTTP 401

### Requirement: Delete a location image

The system SHALL provide `DELETE /api/campaigns/:id/locations/:slug/images/:imageId` that removes
the row, unlinks the file, and returns 204 No Content. When the deleted image was the primary and
other images remain, the system SHALL promote the lowest-`sortOrder` survivor to primary in the
same transaction. Minimum role: `editor`.

#### Scenario: Editor deletes a non-primary image

- **WHEN** an editor deletes an image that is not primary
- **THEN** the server returns HTTP 204
- **AND** the row is gone, the file is unlinked, and `entities.imageUrl` is unchanged

#### Scenario: Deleting the primary promotes the next image

- **GIVEN** a location whose primary is A, with surviving images B (`sortOrder` 1) and C
  (`sortOrder` 2)
- **WHEN** an editor deletes A
- **THEN** B becomes primary
- **AND** the location's `entities.imageUrl` equals B's URL

#### Scenario: Deleting the last image clears the location image

- **GIVEN** a location with exactly one image
- **WHEN** an editor deletes it
- **THEN** the gallery is empty
- **AND** the location's `entities.imageUrl` is `null`

#### Scenario: Missing file does not fail the delete

- **GIVEN** an image row whose file is already absent from disk
- **WHEN** an editor deletes it
- **THEN** the server returns HTTP 204 and the row is removed

#### Scenario: Player cannot delete an image

- **WHEN** an authenticated user with `player` or `visitor` role sends a DELETE
- **THEN** the server returns HTTP 403

#### Scenario: Unauthenticated DELETE is rejected

- **WHEN** an unauthenticated request is sent
- **THEN** the server returns HTTP 401

### Requirement: The primary image is mirrored to entities.imageUrl

The system SHALL keep `entities.imageUrl` equal to the URL of the location's primary image, or
`null` when the gallery is empty. This synchronisation SHALL be performed by a single service
function invoked inside the transaction of every gallery mutation, so that no surface reading
`entities.imageUrl` needs to know that galleries exist.

#### Scenario: Every mutation leaves the mirror consistent

- **WHEN** an image is uploaded, promoted to primary, or deleted
- **THEN** after the request completes, `entities.imageUrl` equals the URL of the row with
  `isPrimary = 1`, or `null` if no such row exists

#### Scenario: Existing consumers show the primary without change

- **GIVEN** a location with a gallery whose primary is B
- **WHEN** the location appears in the relationship graph or in a map-pin popover, both of which
  read `entities.imageUrl`
- **THEN** B's image is shown, with no change to those consumers

#### Scenario: A failed mutation leaves no partial state

- **WHEN** a set-primary transaction fails partway
- **THEN** the previous primary is still primary and `entities.imageUrl` still points at it

### Requirement: Location gallery on the detail page

The location detail page (`app/pages/campaigns/[id]/locations/[slug]/index.vue`) SHALL display an
Images panel showing the location's images as a grid in gallery order, with each image's caption
beneath it and the primary image visually marked. The panel SHALL be hidden when the gallery is
empty and the viewer cannot edit.

#### Scenario: Member sees the gallery

- **GIVEN** a location with three images
- **WHEN** a campaign member opens the location detail page
- **THEN** an Images panel renders all three in gallery order with their captions

#### Scenario: Primary image is identified

- **WHEN** the gallery renders
- **THEN** the primary image carries a visible marker distinguishing it from the others

#### Scenario: Empty gallery is hidden from a player

- **GIVEN** a location with no images
- **WHEN** a `player` opens the detail page
- **THEN** no Images panel is rendered

#### Scenario: Empty gallery offers upload to an editor

- **GIVEN** a location with no images
- **WHEN** an `editor` opens the detail page
- **THEN** an Images panel is rendered with an upload control

#### Scenario: Player sees no management controls

- **WHEN** a user with `player` role views a location with images
- **THEN** no upload, delete, caption or set-primary control is rendered

### Requirement: Location gallery management

An `editor` or above SHALL be able to upload an image, edit its caption, reorder it, set it as the
main image, and delete it, from the location detail page and the location edit page
(`app/pages/campaigns/[id]/locations/[slug]/edit.vue`), with the panel updating in place rather
than through a full page reload.

#### Scenario: Editor uploads from the gallery panel

- **WHEN** an editor picks a file in the Images panel
- **THEN** an upload progress indicator is shown and the new image appears in the grid on success

#### Scenario: Editor sets the main image

- **WHEN** an editor clicks "Set as main image" on a non-primary image
- **THEN** the primary marker moves to that image without a page reload
- **AND** the location's header image updates to match

#### Scenario: Editor deletes an image

- **WHEN** an editor confirms deletion of an image
- **THEN** it disappears from the grid without a page reload

#### Scenario: Upload failure surfaces an error

- **WHEN** an upload is rejected by the server (bad type, too large)
- **THEN** the panel shows the server's error message and the grid is unchanged

#### Scenario: Gallery strings are translated

- **WHEN** the UI is viewed in `en` or `es`
- **THEN** every gallery label, button and error uses a key present in both
  `i18n/locales/en.json` and `i18n/locales/es.json`

### Requirement: Existing single location images are preserved

The migration SHALL create a gallery row for every location that already has a non-null
`entities.imageUrl`, marked primary with `sortOrder` `0`, copying the existing file into the new
layout. The migration SHALL be idempotent.

#### Scenario: Existing image becomes the primary gallery image

- **GIVEN** a location whose `entities.imageUrl` is
  `/api/campaigns/{id}/entities/{slug}/image` and whose file exists on disk
- **WHEN** the migration runs
- **THEN** the location has exactly one gallery image, marked primary
- **AND** the image is retrievable through the gallery serve endpoint

#### Scenario: Migration is idempotent

- **WHEN** the migration runs a second time
- **THEN** no duplicate gallery rows are created and no files are overwritten

#### Scenario: Location without an image is untouched

- **GIVEN** a location whose `imageUrl` is `null`
- **WHEN** the migration runs
- **THEN** it has no gallery rows and its `imageUrl` remains `null`

#### Scenario: Missing source file does not abort the migration

- **GIVEN** a location whose `imageUrl` points at a file that no longer exists
- **WHEN** the migration runs
- **THEN** the migration completes for all other locations without error

### Requirement: aleph-cli manages location images

The aleph-cli SHALL expose the gallery through `location` subcommands: `images <slug>` to list,
`image-add <slug> --file <path> [--caption <text>]` to upload, `image-update <slug> <imageId>
[--caption <text>] [--order <n>]`, `image-set-primary <slug> <imageId>`, and `image-remove <slug>
<imageId>`. Both `docs/claude-skill.md` and `.claude/skills/aleph-cli/SKILL.md` SHALL document
them, with a `version` bump in the local skill's frontmatter.

#### Scenario: CLI lists a location's images

- **WHEN** a user runs `aleph location images <slug> --campaign <id>` with a valid API key
- **THEN** the images are printed in gallery order with their ids, captions and a primary marker

#### Scenario: CLI uploads an image

- **WHEN** a user runs `aleph location image-add <slug> --campaign <id> --file cover.png`
- **THEN** the image is uploaded via multipart and the new image's id and URL are printed

#### Scenario: CLI sets the main image

- **WHEN** a user runs `aleph location image-set-primary <slug> <imageId> --campaign <id>`
- **THEN** that image becomes primary and the change is confirmed on stdout

#### Scenario: CLI without an API key fails cleanly

- **WHEN** any of the image commands is run with no configured API key
- **THEN** the CLI exits non-zero with an authentication error, not a stack trace

#### Scenario: Both skill files stay in step

- **WHEN** the CLI image commands are added
- **THEN** `docs/claude-skill.md` and `.claude/skills/aleph-cli/SKILL.md` both document the same
  command surface
