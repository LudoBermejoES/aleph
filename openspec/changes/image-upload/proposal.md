## Why

The MarkdownEditor (Tiptap) has no way to include images in wiki entries, character descriptions, session notes, or any other rich-text content. Users need to paste or drag images directly into the editor, have them uploaded to the server, and see them rendered inline — matching the workflow they expect from modern document editors.

## What Changes

- Add a server API endpoint for uploading images tied to a campaign (stores files in the campaign content directory).
- Add the `@tiptap/extension-file-handler` extension to intercept paste and drop events containing image files.
- Replace the existing (unused) `@tiptap/extension-image` with `tiptap-image-plus` — a free community extension that adds drag-to-resize handles, image alignment (left/center/right), and custom wrapper styles over the standard image node.
- On paste/drop, upload the image to the server and insert an `<img>` node with the returned URL.
- Add a toolbar button to insert an image via file picker as an alternative to paste/drop.
- Serve uploaded images via a new GET endpoint so they can be embedded in the editor and exported.

## Capabilities

### New Capabilities
- `editor-image-upload`: Paste, drop, or picker-insert images in the MarkdownEditor; images are uploaded to the campaign and rendered inline.

### Modified Capabilities
- `character-management`: Character description field (MarkdownEditor) gains image support — no spec-level requirement change, implementation only.

## Impact

- **New API endpoints**: `POST /api/campaigns/:id/images` (upload), `GET /api/campaigns/:id/images/:filename` (serve)
- **New packages**: `@tiptap/extension-file-handler`, `tiptap-image-plus` (both free npm packages)
- **Modified components**: `app/components/MarkdownEditor.client.vue`
- **Storage**: Images stored in `{campaign.contentDir}/images/` on disk, same pattern as map images
- **aleph-cli**: No CLI impact — image upload is a browser-only interaction
