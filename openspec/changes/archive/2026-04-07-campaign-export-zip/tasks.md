## 1. Dependencies

- [x] 1.1 Add `fflate` to `package.json` dependencies and run `npm install`

## 2. Export Service

- [x] 2.1 Add `buildCampaignExportZip(db, options): Buffer` to `server/services/campaign-export.ts` — builds the ZIP in memory using `fflate.zipSync`: adds `campaign.json` (result of existing `buildCampaignExport` without the `images` call, version `"1.2"`) and each resolved image file under `images/{filename}`
- [x] 2.2 Remove the `embedImages` / `collectImageUrls` call from `buildCampaignExport` (keep the helpers for v1.1 backward compat in import); remove the `images` field from the return value of `buildCampaignExport`
- [x] 2.3 Update the `CampaignExport` interface: remove `images?: Record<string, string>` (or mark as `@deprecated`)

## 3. Export Endpoint

- [x] 3.1 Update `server/api/campaigns/[id]/export.get.ts` to call `buildCampaignExportZip`, set `Content-Type: application/zip`, set `Content-Disposition` with `.zip` filename, and send the buffer via `send(event, buffer)`

## 4. Import Service

- [x] 4.1 Add `importCampaignFromZip(db, zipBuffer: Buffer, userId: string, nameOverride?: string)` to `server/services/campaign-import.ts` — uses `fflate.unzipSync` to extract `campaign.json` and `images/*` entries, writes image files to the new campaign's content directory, then calls the existing import logic with URL rewriting

## 5. Import Endpoint

- [x] 5.1 Update `server/api/campaigns/import.post.ts` to detect `Content-Type`:
  - `multipart/form-data`: read `file` field, validate it's a ZIP, call `importCampaignFromZip`
  - `application/json`: existing path, accepts `"1.0"` and `"1.1"` only
- [x] 5.2 Update version validation: JSON path accepts `["1.0", "1.1"]`; ZIP path validates `"1.2"` inside the extracted `campaign.json`; both return 422 on unsupported version
- [x] 5.3 Add 422 response for malformed ZIP (unzip throws) and for ZIP missing `campaign.json`

## 6. CLI

- [x] 6.1 Update `cli/src/commands/campaign.js` export command: save response body as `.zip`; require `--output` flag (error if omitted, since binary ZIP cannot be written to stdout meaningfully)
- [x] 6.2 Update `cli/src/commands/campaign.js` import command: detect `.zip` file extension, send as `multipart/form-data` with `file` field instead of JSON body
- [x] 6.3 Update `docs/claude-skill.md` and `.claude/skills/aleph-cli/SKILL.md` to reflect the new export/import behavior (ZIP format, `--output` required for export)

## 7. Frontend

- [x] 7.1 Update the export button label/tooltip if it references "JSON" — change to "ZIP" or generic "Export"
- [x] 7.2 Update the `Content-Disposition` filename check in the frontend download handler if it hardcodes `.json`

## 8. Unit Tests

- [x] 8.1 Add unit tests for `buildCampaignExportZip` in `tests/unit/server/campaign-export.test.ts`: ZIP buffer is returned, contains `campaign.json`, version is `"1.2"`, image files present when images exist
- [x] 8.2 Add unit tests for `importCampaignFromZip`: extracts `campaign.json`, writes image files, returns new campaign; 422 on malformed ZIP; 422 on missing `campaign.json`

## 9. Integration Tests

- [x] 9.1 Update `tests/integration/campaign-export.test.ts`: assert `Content-Type: application/zip`, parse ZIP from response buffer, assert `campaign.json` version `"1.2"`, assert image file present in ZIP
- [x] 9.2 Add integration test: upload image to entity, export, assert image entry in ZIP matches uploaded bytes
- [x] 9.3 Add integration test: ZIP export → ZIP import round-trip — assert entity `imageUrl` points to new campaign ID
- [x] 9.4 Add integration test: JSON import with `version: "1.0"` still succeeds (backward compat)
- [x] 9.5 Add integration test: JSON import with `version: "1.1"` still succeeds (backward compat)
- [x] 9.6 Add integration test: JSON import with `version: "1.2"` returns 422 (wrong content type)
- [x] 9.7 Add integration test: malformed ZIP returns 422; ZIP missing `campaign.json` returns 422

## 10. E2E Tests

- [x] 10.1 Update `tests/e2e/campaign-export.spec.ts`: assert download filename ends in `.zip`; update round-trip test to upload a ZIP and assert entity image is visible in the imported campaign
