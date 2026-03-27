## 1. Server — Upload Endpoint

- [x] 1.1 Create `server/api/campaigns/[id]/images/index.post.ts` — multipart upload, validate MIME (png/jpeg/webp/gif) and size (≤ 10 MB), write to `{campaign.contentDir}/images/{uuid}{ext}`, return `{ url, filename }`
- [x] 1.2 Enforce minimum `editor` role; return 403 otherwise
- [x] 1.3 Create the `images/` subdirectory with `mkdir({ recursive: true })` before writing

## 2. Server — Serve Endpoint

- [x] 2.1 Create `server/api/campaigns/[id]/images/[filename].get.ts` — read file from disk, respond with correct `Content-Type` and `Cache-Control: public, max-age=31536000`
- [x] 2.2 Return 404 if file does not exist; return 401/403 if unauthenticated or not a campaign member

## 3. Frontend — Tiptap Extensions

- [x] 3.1 Install `@tiptap/extension-file-handler` and `tiptap-image-plus` (`npm install @tiptap/extension-file-handler tiptap-image-plus`)
- [x] 3.2 Replace the unused `@tiptap/extension-image` import with `tiptap-image-plus` in `MarkdownEditor.client.vue`; configure with `allowBase64: false`; add alignment toolbar buttons (left/center/right)
- [x] 3.3 Add `FileHandler` extension with `allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif']`; implement `onPaste` and `onDrop` callbacks that call the upload API and insert an image node

## 4. Frontend — Upload Composable

- [x] 4.1 Create `app/composables/useImageUpload.ts` — exports an `uploadImage(campaignId, file)` function that POSTs to `/api/campaigns/:id/images` and returns the URL

## 5. Frontend — Toolbar Button

- [x] 5.1 Add an image toolbar button to `MarkdownEditor.client.vue` (camera/image icon)
- [x] 5.2 Attach a hidden `<input type="file" accept="image/*">` triggered by the button click; on file selection call `uploadImage` and insert an image node at the current cursor position

## 6. Integration Tests

- [x] 6.1 Write `tests/integration/image-upload.test.ts` — test POST upload (valid, invalid MIME, oversized, 403, 401)
- [x] 6.2 Test GET serve endpoint (200 with correct headers, 404 for missing file, 401 unauthenticated)

## 7. E2E Tests

- [x] 7.1 Write `tests/e2e/image-upload.spec.ts` — test toolbar button: pick a file, verify `<img>` appears in editor
- [x] 7.2 Test that saved content reloads with the image rendered (Markdown round-trip)
