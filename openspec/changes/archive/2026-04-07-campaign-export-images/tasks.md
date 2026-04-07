## 1. Export: Collect and Embed Images

- [x] 1.1 Add `images?: Record<string, string>` to the `CampaignExport` interface in `server/services/campaign-export.ts`
- [x] 1.2 Add a `collectImageUrls(exportData: CampaignExport): string[]` helper that iterates all image-bearing fields (`entities[].imageUrl`, `characters[].portraitUrl`, `sessionGroups[].imageUrl`, `maps[].imagePath`, map layers' `imagePath`, `items[].imagePath`) and returns unique non-null URL strings
- [x] 1.3 Add an `embedImages(urls: string[], contentDir: string): Record<string, string>` helper that resolves each URL to a filesystem path under `contentDir/images/`, reads the file, base64-encodes it, and returns the map; silently skips missing files
- [x] 1.4 Call `collectImageUrls` and `embedImages` at the end of `buildCampaignExport()` and set `result.images`
- [x] 1.5 Bump the export `version` constant from `"1.0"` to `"1.1"` in `buildCampaignExport()`

## 2. Import: Restore Images and Rewrite URLs

- [x] 2.1 Add an `extractAndWriteImages(images: Record<string, string>, newContentDir: string): Map<string, string>` helper in `server/services/campaign-import.ts` that decodes each base64 data URI, writes the file to `{newContentDir}/images/{filename}`, and returns a map from old URL to new URL
- [x] 2.2 Add a `rewriteImageUrl(oldUrl: string | null | undefined, urlMap: Map<string, string>): string | null` helper that returns the mapped new URL or the original if not found
- [x] 2.3 In `importCampaign()`, after writing image files, apply `rewriteImageUrl` to all image fields when inserting entities, characters, sessionGroups, maps (and map layers), and items
- [x] 2.4 Update the version validation in `server/api/campaigns/import.post.ts` to accept `["1.0", "1.1"]`

## 3. Unit Tests

- [x] 3.1 Add unit tests in `tests/unit/server/campaign-export.test.ts` for `collectImageUrls` — covers all five resource types, deduplication, and null handling
- [x] 3.2 Add unit tests for `embedImages` — covers successful read+encode, missing file skipped, correct data URI format
- [x] 3.3 Add unit tests in a new `tests/unit/server/campaign-import.test.ts` (or extend existing) for `extractAndWriteImages` — covers decode+write, filename extraction, return map
- [x] 3.4 Add unit test for `rewriteImageUrl` — maps known URL, passes through unknown URL, handles null

## 4. Integration Tests

- [x] 4.1 Add integration test in `tests/integration/campaign-export.test.ts`: upload an image to a campaign, export it, assert `version === "1.1"` and `images` map contains the uploaded URL with a valid base64 data URI
- [x] 4.2 Add integration test: export + import round-trip — assert the image file exists on disk in the new campaign's content dir and the entity's `imageUrl` points to the new campaign ID
- [x] 4.3 Add integration test: import a `"1.0"` export (no `images` key) succeeds with status 201
- [x] 4.4 Add integration test: import with `version: "1.1"` succeeds; import with `version: "2.0"` returns 422

## 5. E2E Tests

- [x] 5.1 Add or extend `tests/e2e/campaign-export.spec.ts`: export a campaign that has at least one entity with an image, re-import it, navigate to the entity page, and assert the portrait/image is visible (no broken image)
