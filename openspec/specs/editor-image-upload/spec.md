# editor-image-upload Specification

## Purpose
TBD - created by archiving change image-upload. Update Purpose after archive.
## Requirements
### Requirement: Upload image via API
The system SHALL provide a `POST /api/campaigns/:id/images` endpoint that accepts a multipart form upload (field name `file`), validates the MIME type and file size, stores the file in `{campaign.contentDir}/images/{uuid}{ext}`, and returns `{ url, filename }`. Minimum role: `editor`.

#### Scenario: Editor uploads a valid image
- **WHEN** an authenticated user with `editor` role or above sends a `POST /api/campaigns/:id/images` request with a valid PNG, JPEG, WebP, or GIF file ≤ 10 MB
- **THEN** the server returns HTTP 200 with `{ url: "/api/campaigns/:id/images/:filename", filename }` and the file is written to disk

#### Scenario: Upload rejected for invalid MIME type
- **WHEN** a user uploads a file with a MIME type other than `image/png`, `image/jpeg`, `image/webp`, or `image/gif`
- **THEN** the server returns HTTP 400 with a descriptive error message and no file is written

#### Scenario: Upload rejected for oversized file
- **WHEN** a user uploads an image larger than 10 MB
- **THEN** the server returns HTTP 400 with a message indicating the size limit

#### Scenario: Upload rejected for insufficient role
- **WHEN** an authenticated user with `player` or `visitor` role attempts to upload an image
- **THEN** the server returns HTTP 403

#### Scenario: Upload rejected for unauthenticated request
- **WHEN** an unauthenticated request is sent to `POST /api/campaigns/:id/images`
- **THEN** the server returns HTTP 401

### Requirement: Serve uploaded images
The system SHALL provide a `GET /api/campaigns/:id/images/:filename` endpoint that reads the file from disk and responds with the correct `Content-Type` header and appropriate caching headers. Minimum role: `visitor`.

#### Scenario: Member retrieves an uploaded image
- **WHEN** an authenticated campaign member sends `GET /api/campaigns/:id/images/:filename`
- **THEN** the server responds with the image bytes, correct `Content-Type`, and `Cache-Control: public, max-age=31536000`

#### Scenario: Image not found returns 404
- **WHEN** the requested filename does not exist on disk
- **THEN** the server returns HTTP 404

#### Scenario: Unauthenticated request is rejected
- **WHEN** an unauthenticated request is sent to `GET /api/campaigns/:id/images/:filename`
- **THEN** the server returns HTTP 401

### Requirement: Paste image into editor
The MarkdownEditor SHALL intercept clipboard paste events containing image files, upload them to `POST /api/campaigns/:id/images`, and insert an inline image node at the cursor position with the returned URL.

#### Scenario: User pastes an image from clipboard
- **WHEN** a user pastes an image file (e.g. a screenshot) into a MarkdownEditor
- **THEN** the image is uploaded and an `<img>` tag with the server URL is inserted at the cursor

#### Scenario: Paste of non-image content is unaffected
- **WHEN** a user pastes plain text or HTML with no image files
- **THEN** the existing paste behaviour is unchanged

### Requirement: Drop image into editor
The MarkdownEditor SHALL intercept drag-and-drop events where the dropped payload contains image files, upload them, and insert inline image nodes at the drop position.

#### Scenario: User drops an image file onto the editor
- **WHEN** a user drags an image file from their desktop and drops it into a MarkdownEditor
- **THEN** the image is uploaded and rendered inline at the drop position

### Requirement: Insert image via toolbar button
The MarkdownEditor toolbar SHALL include an image-insert button that opens a native file picker; on selection the file is uploaded and an image node is inserted.

#### Scenario: User clicks the image button and selects a file
- **WHEN** a user clicks the image toolbar button and selects a valid image file
- **THEN** the file is uploaded and an image node appears in the editor

#### Scenario: User cancels the file picker
- **WHEN** a user opens the file picker and dismisses it without selecting a file
- **THEN** the editor content is unchanged

### Requirement: Images serialise to Markdown
Image nodes in the editor SHALL serialise to standard Markdown `![alt](url)` syntax so that content stored as Markdown retains image references correctly.

#### Scenario: Editor content with image round-trips through Markdown
- **WHEN** an image node is present in the editor and the content is saved and reloaded
- **THEN** the image is rendered correctly in the editor from the stored Markdown

