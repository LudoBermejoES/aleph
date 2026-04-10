## 1. WebP Conversion Utility

- [x] 1.1 Create `app/utils/convert-to-webp.ts` with `convertToWebP(file: File | Blob): Promise<Blob>` — use `createImageBitmap` + `OffscreenCanvas.convertToBlob({ type: 'image/webp', quality: 0.82 })`, fall back to `HTMLCanvasElement.toBlob`, pass through GIFs unchanged, return original on failure
- [x] 1.2 Write unit tests for `convertToWebP` in `tests/unit/convert-to-webp.test.ts` — cover PNG→WebP, JPEG→WebP, GIF passthrough, and fallback on conversion failure (mock Canvas API as needed)

## 2. Custom Asset Store

- [x] 2.1 Create `app/utils/aleph-asset-store.ts` exporting `createAlephAssetStore(campaignId: string): TLAssetStore` — `upload()` calls `convertToWebP` on the file, then POSTs the result to `/api/campaigns/{campaignId}/images` via `$fetch`, returns `{ src: serverUrl }`. On upload failure, fall back to `inlineBase64AssetStore.upload()`
- [x] 2.2 Write unit tests for `createAlephAssetStore` in `tests/unit/aleph-asset-store.test.ts` — mock `$fetch` and `convertToWebP`, verify upload call, verify fallback on error

## 3. Wire Asset Store into TldrawWrapper

- [x] 3.1 Update `app/components/diagrams/react/TldrawWrapper.tsx` — accept `campaignId` prop (already present), import `createAlephAssetStore`, replace `inlineBase64AssetStore` with `createAlephAssetStore(campaignId)` in both the `useSync({ assets })` call and snapshot-mode `Tldraw` component (via `assets` prop)
- [x] 3.2 Verify that the `campaignId` prop is passed from `TldrawCanvas.vue` → `TldrawWrapper.tsx` (it already is — confirm no changes needed)

## 4. Update .tldr Import Flow

- [x] 4.1 Update `uploadAssets()` in `app/pages/campaigns/[id]/diagrams/[diagramId].vue` — after decoding base64 to Blob, call `convertToWebP(blob)` before creating the FormData. Update the filename extension to `.webp` for converted assets
- [x] 4.2 Write integration test verifying `.tldr` import converts PNG assets to WebP — upload a .tldr with an embedded PNG, verify the server-stored file is WebP

## 5. E2E Testing

- [x] 5.1 Write E2E test in `tests/e2e/diagram-image-paste.spec.ts` — create a diagram, paste an image via clipboard API, verify the resulting asset src is a server URL (not base64) and the stored file is WebP
