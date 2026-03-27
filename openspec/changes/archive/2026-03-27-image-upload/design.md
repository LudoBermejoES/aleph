## Context

The MarkdownEditor uses Tiptap v3 with a rich extension set (StarterKit, collaboration, mentions, etc.). The `@tiptap/extension-image` package is already installed but not wired up. The server already has a proven pattern for file uploads: `POST /api/campaigns/:id/maps/:slug/upload` writes files to `{campaign.contentDir}/maps/{slug}/` and a companion GET serves them. We reuse this exact pattern for editor images.

Tiptap's `@tiptap/extension-file-handler` (free, not Pro) is the standard way to intercept paste and drop events containing files, call an async upload function, and insert the resulting node.

## Goals / Non-Goals

**Goals:**
- Paste an image from clipboard → upload → inline `<img>` node in editor
- Drag-and-drop an image file onto the editor → same flow
- Toolbar "insert image" button → file picker → same flow
- Serve uploaded images via a stable URL (`/api/campaigns/:id/images/:filename`)
- Images scoped to campaign; only campaign members can access them (same RBAC as all other campaign resources)
- Markdown serialisation: image nodes serialise as `![](url)` and round-trip correctly

**Non-Goals:**
- Image resizing/cropping UI in the editor (can add later via tiptap Image `resize` option)
- Deduplication of identical uploads
- Image management page / gallery
- aleph-cli image upload command

## Decisions

### 1. Storage: flat files per campaign, random filename
`{campaign.contentDir}/images/{uuid}{ext}` — mirrors the map upload pattern. A UUID filename avoids collisions and prevents path-traversal guessing. No DB table needed; the image URL embedded in markdown is the reference.

**Alternative considered:** Storing images in a DB table (id, campaignId, path, uploadedBy). Rejected: adds schema complexity and migrations with no benefit for the current use case (images are just embedded URLs in markdown).

### 2. Upload endpoint: `POST /api/campaigns/:id/images`
Multipart form, field name `file`, returns `{ url: "/api/campaigns/:id/images/:filename" }`. Requires `editor` role minimum (same as entity edit).

**Serve endpoint:** `GET /api/campaigns/:id/images/:filename` — reads file from disk, streams with correct Content-Type and Cache-Control headers. Auth: campaign members (visitor+).

### 3. Tiptap integration: `@tiptap/extension-file-handler` + `tiptap-image-plus`
`FileHandler` handles paste and drop; its `onPaste`/`onDrop` callbacks call the upload endpoint (via `$fetch`) and insert an image node. Instead of bare `@tiptap/extension-image`, we use `tiptap-image-plus` (free community extension, supports Tiptap v3) which adds drag-to-resize handles, left/center/right alignment, and wrapper styles — with `allowBase64: false`.

**Alternative considered:** Custom PasteRule on the Image extension. `FileHandler` is cleaner — it handles both paste and drop, filters MIME types, and is the officially recommended approach. `tiptap-image-plus` was chosen over bare `@tiptap/extension-image` because it adds resize/alignment UX with no extra cost.

### 4. Toolbar button: file input (hidden `<input type="file">`)
A toolbar button triggers a hidden file input. On change, same upload-then-insert flow. Reuses the same upload composable.

### 5. No new DB migration needed
Images are purely filesystem-based. The markdown content already stores the URL string. No schema change required.

## Risks / Trade-offs

- **Orphaned images**: Deleting an entity/character/session doesn't delete images referenced in its markdown. → Acceptable for now; a future cleanup job can scan content dirs.
- **Large uploads**: No client-side size limit on the file picker (server enforces 10MB). → Show an error toast on 413.
- **Collaboration**: Multiple users pasting simultaneously could both upload; each gets its own UUID file, both succeed. → Not a risk.
- **Base64 from clipboard**: Some apps paste images as base64 HTML. `FileHandler` receives the raw `File` object, not the HTML, so base64 blobs are not inserted. → Handled correctly by the extension.

## Migration Plan

1. Deploy server changes (new endpoints) — backwards compatible, no migration.
2. Deploy frontend changes — new editor extensions, toolbar button.
3. No rollback complexity; images not uploaded won't appear, existing content unaffected.

## Open Questions

- Max file size: proposed **10 MB** (much smaller than map images which allow 100 MB). Confirm?
- Accepted types: `image/png`, `image/jpeg`, `image/webp`, `image/gif` — confirm GIF support?
