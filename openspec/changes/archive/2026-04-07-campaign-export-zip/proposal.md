## Why

The current v1.1 export embeds all campaign images as base64 data URIs inside a single JSON payload. On campaigns with many or large images this causes a `RangeError: Invalid string length` crash at `JSON.stringify` because V8's string limit (~512 MB) is exceeded. A ZIP-based format streams raw image bytes alongside the JSON, eliminating the memory ceiling entirely.

## What Changes

- **Export** returns a `.zip` archive (`Content-Type: application/zip`) instead of a `.json` file. The archive contains `campaign.json` (data, no `images` key) + `images/` directory with raw image files. Export version bumped to `"1.2"`.
- **Import** gains a second accepted content type: `multipart/form-data` with a `file` field containing the ZIP. The existing `application/json` path is kept for v1.0/v1.1 backward compatibility.
- **Version validation** updated to accept `"1.0"`, `"1.1"`, and `"1.2"`. Anything else returns 422.
- **CLI** `campaign export` command saves the downloaded file as `.zip` instead of `.json`.
- **`buildCampaignExport`** no longer embeds images in the return value; the export endpoint writes the ZIP directly to the response stream using a ZIP library.
- The `images` field is removed from the `CampaignExport` interface (or made permanently unused for v1.2 paths).

## Capabilities

### New Capabilities

- `campaign-export-zip`: ZIP-based campaign export format (v1.2) — building archive, streaming response, CLI download

### Modified Capabilities

- `campaign-export`: export endpoint now returns a ZIP instead of JSON; version changes to `"1.2"`
- `campaign-import`: import endpoint now accepts multipart ZIP upload in addition to JSON body
- `campaign-export-images`: v1.1 image embedding via base64 is superseded; image transport moves to ZIP

## Impact

- `server/services/campaign-export.ts` — remove `embedImages`/`collectImageUrls` call from `buildCampaignExport`; new `buildCampaignExportZip` function returns a ZIP buffer
- `server/api/campaigns/[id]/export.get.ts` — set `Content-Type: application/zip`, stream ZIP buffer
- `server/services/campaign-import.ts` — add `importCampaignFromZip` path; reuse existing URL-rewrite logic
- `server/api/campaigns/import.post.ts` — detect content type, branch to ZIP or JSON handler
- `cli/src/commands/campaign.js` — change export file extension and content-type handling
- New npm dependency needed: a ZIP library (e.g. `jszip` or `adm-zip` or `archiver` + `unzipper`)
- `tests/unit/`, `tests/integration/`, `tests/e2e/` — update export/import tests for ZIP format
- **CLI impact**: yes — `campaign export` must save `.zip`; `campaign import` may need to accept a `.zip` file path
