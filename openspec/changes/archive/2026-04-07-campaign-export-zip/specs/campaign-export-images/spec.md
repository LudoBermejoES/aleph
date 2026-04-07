## REMOVED Requirements

### Requirement: Export embeds images as base64 data URIs

**Reason**: Base64 embedding in JSON causes `RangeError: Invalid string length` for campaigns with many or large images due to V8's ~512 MB string serialization limit. Images are now transported as raw files inside a ZIP archive (v1.2).
**Migration**: Use `GET /api/campaigns/:id/export` which now returns a ZIP. The `images` key is no longer present in the export JSON. Image files are stored as `images/{filename}` entries in the ZIP.

### Requirement: Import restores embedded images and rewrites URLs

**Reason**: Superseded by ZIP-based import. The base64 decode+write path only applied to v1.1 imports.
**Migration**: Import via `POST /api/campaigns/import` with `Content-Type: multipart/form-data` and a `file` field containing the v1.2 ZIP. Image files are extracted from the ZIP and written to the new campaign's content directory. URL rewriting behavior is identical.
