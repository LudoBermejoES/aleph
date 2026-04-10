## ADDED Requirements

### Requirement: WebP conversion utility

The system SHALL provide a client-side utility function `convertToWebP(file: File | Blob): Promise<Blob>` that converts image files to WebP format using the Canvas API with quality 0.82.

#### Scenario: Convert PNG to WebP

- **WHEN** a PNG file is passed to `convertToWebP`
- **THEN** the returned Blob SHALL have MIME type `image/webp`
- **AND** the returned Blob SHALL be smaller than or equal to the original PNG

#### Scenario: Convert JPEG to WebP

- **WHEN** a JPEG file is passed to `convertToWebP`
- **THEN** the returned Blob SHALL have MIME type `image/webp`

#### Scenario: GIF passthrough

- **WHEN** a GIF file is passed to `convertToWebP`
- **THEN** the original file SHALL be returned unchanged (no conversion)
- **AND** the returned Blob SHALL have MIME type `image/gif`

#### Scenario: Conversion failure fallback

- **WHEN** the Canvas API fails to produce a WebP blob (e.g., unsupported browser)
- **THEN** the original file SHALL be returned unchanged

### Requirement: Custom TLAssetStore with server upload

The system SHALL provide a factory function `createAlephAssetStore(campaignId: string): TLAssetStore` that implements the tldraw `TLAssetStore` interface, converting images to WebP and uploading them to the server.

#### Scenario: Image paste triggers WebP upload

- **WHEN** a user pastes an image into a tldraw diagram
- **THEN** the asset store's `upload()` method SHALL convert the image to WebP via `convertToWebP`
- **AND** SHALL upload the converted image to `POST /api/campaigns/{campaignId}/images`
- **AND** SHALL return the server URL as the asset `src` (not inline base64)

#### Scenario: Image drop triggers WebP upload

- **WHEN** a user drops an image file onto a tldraw diagram
- **THEN** the asset store SHALL convert and upload the image identically to paste

#### Scenario: Non-image asset passthrough

- **WHEN** a non-image asset (e.g., bookmark, video) is uploaded via the asset store
- **THEN** the asset store SHALL handle it without conversion (pass through to default behavior or upload as-is)

#### Scenario: Upload failure

- **WHEN** the server upload fails (network error, 403, 413)
- **THEN** the asset store SHALL fall back to inline base64 storage so the image is not lost

### Requirement: Asset store used in both editor modes

The custom asset store SHALL be used in both tldraw rendering modes: snapshot mode and multiplayer sync mode.

#### Scenario: Snapshot mode uses custom asset store

- **WHEN** a diagram is rendered in snapshot mode (REST save)
- **THEN** the `Tldraw` component SHALL use the custom asset store for image handling

#### Scenario: Sync mode uses custom asset store

- **WHEN** a diagram is rendered in multiplayer sync mode (WebSocket via `@tldraw/sync`)
- **THEN** the `useSync` hook SHALL receive the custom asset store via its `assets` parameter

### Requirement: WebP conversion in .tldr import flow

The existing `.tldr` file import flow SHALL convert embedded base64 images to WebP before uploading them to the server.

#### Scenario: Import .tldr with PNG assets

- **WHEN** a user imports a `.tldr` file containing base64-encoded PNG assets
- **THEN** each PNG asset SHALL be converted to WebP via `convertToWebP` before being uploaded to the server
- **AND** the asset `src` in the imported document SHALL point to the server URL of the WebP image

#### Scenario: Import .tldr with GIF assets

- **WHEN** a user imports a `.tldr` file containing base64-encoded GIF assets
- **THEN** GIF assets SHALL be uploaded as-is without WebP conversion

#### Scenario: Import .tldr with assets already as URLs

- **WHEN** a user imports a `.tldr` file where assets already have URL sources (not base64)
- **THEN** those assets SHALL be left unchanged (no re-upload)
