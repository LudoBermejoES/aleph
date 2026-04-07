## Why

Campaign exports are data-only JSON files — images (entity portraits, character portraits, map images, item images) are stored on disk and referenced by URL but not included in the export. This means importing a campaign on a different server produces broken image references. The export should be self-contained and portable.

## What Changes

- Export format bumped from version `"1.0"` to `"1.1"` with a new top-level `images` map embedding all referenced images as base64 data URIs
- `buildCampaignExport()` reads image files from disk and embeds them in the export JSON
- `importCampaign()` extracts embedded images, writes them to the new campaign's content directory, and rewrites image URLs in all imported records
- Version `"1.0"` imports remain fully supported (no `images` key → skip image restoration)
- CLI `campaign export` command passes through unchanged (images are embedded in the JSON automatically)
- Export format version validation in the import endpoint updated to accept both `"1.0"` and `"1.1"`

## Capabilities

### New Capabilities

- `campaign-export-images`: Embedding and restoring campaign images in the export/import JSON format

### Modified Capabilities

- `campaign-export`: Export format gains a new `images` field and version bump to `"1.1"`
- `campaign-import`: Import service gains image extraction and URL rewriting logic; accepts both `"1.0"` and `"1.1"` exports

## Impact

- `server/services/campaign-export.ts` — reads image files from `contentDir/images/`, embeds as base64
- `server/services/campaign-import.ts` — decodes base64 images, writes to new content dir, rewrites URLs
- `server/api/campaigns/import.post.ts` — version validation updated to `["1.0", "1.1"]`
- `tests/unit/server/campaign-export.test.ts` — new image embedding tests
- `tests/integration/campaign-export.test.ts` — round-trip tests with images
- `tests/e2e/campaign-export.spec.ts` — E2E smoke test for image portability
- aleph-cli: no changes needed (export is JSON passthrough; import reads file and POSTs)
