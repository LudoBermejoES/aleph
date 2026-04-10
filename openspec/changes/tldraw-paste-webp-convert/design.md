## Context

Tldraw diagrams in Aleph currently use `inlineBase64AssetStore` as their asset store. When a user pastes or drops an image, tldraw converts it to a base64 data URL and embeds it directly in the document snapshot. This has two costs:

1. **Storage bloat**: A 2MB PNG pasted into a diagram adds ~2.7MB of base64 to the snapshot JSON stored in SQLite (and synced via WebSocket).
2. **No format optimization**: PNGs and BMPs are stored as-is. WebP typically achieves 25-80% smaller sizes for equivalent quality.

The existing server already has an image upload endpoint (`POST /api/campaigns/{id}/images`) that accepts WebP, and the `.tldr` import flow already uploads extracted base64 assets to the server. The gap is that **live paste/drop** still uses the inline store.

## Goals / Non-Goals

**Goals:**

- Convert pasted/dropped images to WebP client-side before storage
- Upload converted images to the server, storing a URL reference instead of inline base64
- Apply the same WebP conversion during `.tldr` file import
- Work in both snapshot mode and multiplayer sync mode

**Non-Goals:**

- Server-side image processing/re-encoding (the server already stores files as-is; we convert client-side)
- Converting existing inline base64 assets in old snapshots (migration of legacy data)
- Compressing video or bookmark assets
- Configurable quality settings in the UI (hardcode a sensible default: 0.82)

## Decisions

### 1. Custom `TLAssetStore` that uploads to server

**Decision**: Replace `inlineBase64AssetStore` with a custom `TLAssetStore` implementation that converts to WebP and uploads to `/api/campaigns/{id}/images`.

**Why**: The `TLAssetStore` interface (`upload`, `resolve?`, `remove?`) is the correct extension point. By implementing `upload()`, we intercept every image before it enters the tldraw document store — covering paste, drop, and file picker in one place.

**Alternatives considered**:

- _Intercepting paste/drop DOM events_: Fragile, doesn't cover tldraw's built-in file picker, and fights with React synthetic events.
- _Server-side conversion on the upload endpoint_: Adds Sharp dependency to the image route (currently only used in map tiling). Client-side is simpler and offloads CPU from the server.

### 2. Client-side Canvas API for WebP conversion

**Decision**: Use `createImageBitmap()` + `OffscreenCanvas.convertToBlob({ type: 'image/webp', quality: 0.82 })` where available, falling back to `HTMLCanvasElement.toBlob()`.

**Why**: `OffscreenCanvas` is available in all modern browsers and works in both main thread and workers. No library dependency needed. Quality 0.82 is a well-tested sweet spot balancing size and visual fidelity.

**Alternatives considered**:

- _WASM-based encoder (e.g., libwebp)_: Adds ~200KB dependency. Overkill when Canvas API handles it natively.
- _Sharp on the server_: Already available in the project for map tiles, but means uploading the full uncompressed image first, wasting bandwidth.

### 3. GIF passthrough — no conversion

**Decision**: Skip WebP conversion for GIF files (animated images) and upload them as-is.

**Why**: Canvas `toBlob('image/webp')` loses animation frames. GIFs are rare in TTRPG diagrams and are typically small.

### 4. Reuse in `.tldr` import flow

**Decision**: Extract the WebP conversion logic into a shared utility (`app/utils/convert-to-webp.ts`) and use it in both the custom asset store and `uploadAssets()`.

**Why**: DRY — both flows need the same conversion. A shared utility avoids duplicating the Canvas/Blob logic.

### 5. Asset store scoped per campaign

**Decision**: Create the asset store as a factory function `createAlephAssetStore(campaignId: string): TLAssetStore` so each diagram knows which campaign to upload to.

**Why**: The upload endpoint is campaign-scoped (`/api/campaigns/{id}/images`). The store needs the campaign ID at construction time.

## Risks / Trade-offs

- **Browser WebP support**: All modern browsers support `canvas.toBlob('image/webp')`. Safari added support in v16 (2022). [Risk: negligible] → Mitigation: if `toBlob` produces null or empty result, fall back to uploading the original format.
- **Quality loss**: WebP is lossy at 0.82. [Risk: acceptable] → TTRPG diagrams are typically maps, tokens, and reference art where minor quality loss is imperceptible. If users need lossless, they can use the image as a map (which preserves originals).
- **Large image conversion blocking UI**: Converting a 10MB PNG on the main thread could cause a brief freeze. [Risk: low] → Mitigation: `createImageBitmap` + `OffscreenCanvas` is already async. For truly large images, the existing 10MB server limit caps the worst case.
- **CSRF tokens for upload**: The image upload endpoint requires auth. The existing `$fetch` from Nuxt handles cookies automatically. [Risk: none]
