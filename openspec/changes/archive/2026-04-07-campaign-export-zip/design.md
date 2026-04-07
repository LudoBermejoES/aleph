## Context

Campaign export currently produces a single JSON file. In v1.1 images were embedded inline as base64 data URIs. This crashes on large campaigns because `JSON.stringify` of the export object exceeds V8's ~512 MB string limit. Moving to a ZIP archive lets us stream raw image bytes alongside structured JSON, with no per-image or total-size ceiling at the serialization layer.

The existing `buildCampaignExport` service returns a plain JS object. The export endpoint lets Nitro call `JSON.stringify` on it internally. The import endpoint reads a JSON body directly. Both sides need to grow a new code path for the ZIP format while keeping the old JSON path alive for backward compatibility.

## Goals / Non-Goals

**Goals:**

- Export returns a `.zip` (`Content-Type: application/zip`) containing `campaign.json` + `images/*`
- Import accepts either a ZIP upload (multipart `file` field) or a raw JSON body
- Version `"1.2"` identifies the ZIP format; `"1.0"` and `"1.1"` continue to work via the JSON path
- CLI `campaign export` saves a `.zip` file; `campaign import` can pass a `.zip` file path
- No regression for existing v1.0/v1.1 users

**Non-Goals:**

- Streaming the ZIP to the client in true chunked fashion (in-memory buffer is acceptable for now)
- Supporting ZIP import from the browser UI (API + CLI only for import)
- Compressing the JSON inside the ZIP (stored, not deflated, is fine)

## Decisions

### ZIP library: `fflate` (pure JS, works in Node and edge runtimes)

**Rationale:** `archiver`/`unzipper` are Node-only streams and don't work in Nitro's edge-compatible runtime. `jszip` is browser/Node isomorphic but async and large. `fflate` is the smallest pure-JS option, synchronous API available, tree-shakeable, and already common in Vite/Nuxt ecosystems. Both zip (export) and unzip (import) are covered by a single package.

**Alternative considered:** `adm-zip` — synchronous and simple, but Node-only and not tree-shakeable. Ruled out for edge compatibility.

### Export: build ZIP in memory, send as Buffer

`buildCampaignExportZip(db, options)` returns a `Buffer` (the ZIP bytes). The export endpoint calls `send(event, buffer)` with the right headers. This keeps the service testable without HTTP context and avoids streaming complexity for now. Acceptable because the bottleneck was `JSON.stringify` on a huge string, not memory usage from raw bytes.

### Import: detect content type to branch

`POST /api/campaigns/import` inspects `Content-Type`:

- `application/json` → existing `importCampaign(db, payload)` path (v1.0/v1.1)
- `multipart/form-data` → read `file` field, unzip, parse `campaign.json`, call new `importCampaignFromZip(db, json, imageEntries, userId)`

Version validation (`"1.2"` only for ZIP; `"1.0"`/`"1.1"` only for JSON) is enforced in each branch, not shared, to keep the branches independent.

### Image file layout inside ZIP: `images/{filename}`

Same filename as it exists on disk (e.g. `portrait.png`, `image.webp`). The import reconstructs the full path from the original URL pattern using the same `resolveImageFile` logic already used in v1.1, but writes bytes from the ZIP entry instead of from a base64 string.

### Reuse existing URL-rewrite logic

`rewriteImageUrl` and the URL-pattern helpers from v1.1 are unchanged. `importCampaignFromZip` calls the same rewrite step after writing image files, so URL rewriting behavior is identical between v1.1 JSON imports and v1.2 ZIP imports.

### v1.1 `embedImages` / `collectImageUrls` kept but not called in export

The v1.1 helpers remain in `campaign-export.ts` for backward compatibility (unit tests still cover them). `buildCampaignExport` no longer calls `embedImages`; the `images` field is removed from the return value. A new `buildCampaignExportZip` function handles the ZIP path.

## Risks / Trade-offs

- **In-memory ZIP for very large campaigns** → Mitigation: raw image bytes are far smaller than base64-encoded strings (≈25% smaller), and the ZIP buffer is written to the response directly without JSON stringification. This is a significant improvement even though it's not streaming. True streaming can be added later if needed.
- **`fflate` API unfamiliarity** → Mitigation: `fflate.zipSync` for export (synchronous, simple), `fflate.unzipSync` for import. Both return `Uint8Array`; convert to/from `Buffer` at the boundary.
- **Multipart import requires `readMultipartFormData`** → Mitigation: already used in `entities/[slug]/image.post.ts`, so the pattern is established in this codebase.
- **CLI must detect `.zip` response** → Mitigation: check `Content-Type: application/zip` in the HTTP response and save with `.zip` extension.

## Migration Plan

1. Deploy new export endpoint (returns ZIP). Old JSON clients that parse the response will get a ZIP instead of JSON — this is a breaking change for any automated consumer that expected JSON. Acceptable because v1.1 was just deployed and not yet in wide use.
2. Old `campaign import` JSON path remains untouched. Users with v1.0/v1.1 exports can still import.
3. CLI updated in the same release to save `.zip` and accept `.zip` on import.
4. No database migration required.

## Open Questions

- Should the UI export button be updated to show a `.zip` file download? (Likely yes, but UI change is cosmetic — the download will already work since browsers handle ZIP natively.)
- Should we keep v1.1 export support (JSON with base64) accessible via a query param like `?format=json` as an escape hatch? Decided: **no** for now — the ZIP format is strictly better and the pain of maintaining two paths outweighs the marginal compatibility benefit.
