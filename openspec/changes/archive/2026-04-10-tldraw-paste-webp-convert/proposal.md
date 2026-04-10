## Why

Tldraw diagrams currently store pasted/dropped images as inline base64 in their original format (PNG, JPEG). These unoptimized images bloat diagram snapshots stored in SQLite and increase sync payload sizes over WebSocket. Converting images to WebP on paste/drop reduces storage by 25-80% depending on source format, improving both persistence and real-time collaboration performance.

## What Changes

- Intercept image paste and drop events in the tldraw canvas before they reach the default `inlineBase64AssetStore`
- Convert intercepted images to WebP format client-side using Canvas API
- Replace the default inline base64 asset store with a custom one that uploads converted images to the server via the existing `/api/campaigns/{id}/images` endpoint
- Return server URLs instead of inline base64 data, further reducing snapshot size
- The existing image upload endpoint already accepts `image/webp` — no server changes needed for storage
- The `.tldr` import flow's `uploadAssets()` function should also convert extracted base64 images to WebP before uploading

## Capabilities

### New Capabilities

- `diagram-image-optimization`: Client-side WebP conversion and server-side storage for images pasted/dropped into tldraw diagrams

### Modified Capabilities

_(none — the existing image upload endpoint already supports WebP; this change adds client-side conversion logic only)_

## Impact

- **Components**: `app/components/diagrams/TldrawWrapper.tsx` — replace `inlineBase64AssetStore` with custom asset store
- **Components**: `app/components/diagrams/TldrawCanvas.vue` — may need adjustments to drop handler
- **Pages**: `app/pages/campaigns/[id]/diagrams/[diagramId].vue` — update `uploadAssets()` in .tldr import flow
- **Server**: No API changes needed — `/api/campaigns/{id}/images` already accepts WebP
- **Dependencies**: No new dependencies — uses native Canvas API + `toBlob('image/webp')`
- **CLI**: No impact — CLI does not interact with diagram assets
- **Breaking**: None — existing diagrams with inline base64 images continue to work; only new pastes are converted
