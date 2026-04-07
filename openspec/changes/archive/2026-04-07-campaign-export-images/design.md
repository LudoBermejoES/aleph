## Context

Campaign exports are self-contained JSON files. Currently version `"1.0"` exports include all relational data but not binary assets. Images are stored on disk at `{contentDir}/images/{uuid}.{ext}` and referenced by API URL (`/api/campaigns/{id}/images/{filename}`). On import to a new server these URLs break immediately.

The export service (`server/services/campaign-export.ts`) builds a `CampaignExport` object and returns it as JSON. The import service (`server/services/campaign-import.ts`) reconstructs all records with new UUIDs and a new content directory. Both services are pure TypeScript with no current awareness of the filesystem image store.

Image-bearing fields across the data model:

- `entities.imageUrl`
- `characters.portraitUrl`
- `sessionGroups.imageUrl`
- `maps.imagePath` (and `mapLayers.imagePath`)
- `items.imagePath`

## Goals / Non-Goals

**Goals:**

- Export embeds all referenced images as base64 data URIs under a top-level `images` map
- Import writes embedded images to the new campaign's content directory and rewrites all URL fields
- Format version bumps to `"1.1"`; `"1.0"` imports continue to work unchanged
- Missing image files are silently skipped (warn but don't fail the export)

**Non-Goals:**

- Markdown content file embedding (separate concern, large blobs)
- Map tile image embedding (tiles are referenced differently and can be very large)
- Image deduplication across the export
- Any UI changes

## Decisions

### 1. Embed images as base64 in the JSON, keyed by original URL

**Decision:** Add a top-level `images: Record<string, string>` field to `CampaignExport`. Keys are the original image URLs (e.g. `/api/campaigns/{id}/images/abc.png`), values are `data:image/png;base64,...` strings.

**Rationale:** Keeps the export a single portable file. Alternatives considered:

- ZIP archive with JSON + image files: more portable for large images, but requires multipart handling in the API and CLI; much more implementation complexity.
- Separate image download step: breaks the "one file = one export" guarantee.

Base64 inflates file size ~33%. For typical campaign portraits (dozens of images, each <1 MB), this is acceptable. Map layer images can be large — they are included but the risk is noted.

### 2. Collect image URLs during the existing export pass, then read files

**Decision:** After `buildCampaignExport()` builds the data records, a second pass collects all image URL strings from the known fields, resolves each to a filesystem path using the campaign's `contentDir`, reads the file, and encodes it.

**Rationale:** Keeps the data export logic unchanged. Image embedding is an additive post-processing step.

### 3. URL rewriting during import via a dedicated helper

**Decision:** Add a `rewriteImageUrls(record, oldCampaignId, newCampaignId)` helper that rewrites known image fields in-place after ID remapping. Images are written to the new content dir first; then every record's image field is updated from the old URL to the new URL.

**Rationale:** Centralises rewriting logic. Avoids duplicating field-name knowledge across 5 resource types.

### 4. Version validation accepts `["1.0", "1.1"]`

**Decision:** The import endpoint currently checks `version === "1.0"`. Change to `["1.0", "1.1"].includes(version)`.

**Rationale:** Simple backward compatibility. Future breaking format changes get a new version.

## Risks / Trade-offs

- **Large exports**: A campaign with many high-resolution map images could produce a very large JSON file (hundreds of MB). Mitigation: document the limitation; future work could add a `--no-images` flag to the CLI export command.
- **Missing files**: If an image file is missing from disk (deleted manually), export silently skips it and logs a warning. The imported campaign will have a broken image URL for that record. Mitigation: warn clearly in the export response/log.
- **Map layer images**: Maps can have multiple layers each with their own `imagePath`. These are included in the collection pass and embedded. No special handling needed beyond treating them the same as other image fields.

## Migration Plan

No database migration needed. The change is purely in the export/import service layer and the JSON format. Existing `"1.0"` exports are unaffected.
