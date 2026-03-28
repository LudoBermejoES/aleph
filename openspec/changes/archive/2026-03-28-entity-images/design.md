## Context

Characters already have portrait image support via a `portraitUrl` column on the `characters` table, a dedicated upload/serve API pair, a `CharacterPortrait.vue` component, and a CLI `upload-portrait` command. Entities (the base wiki unit) have no image support. Since characters extend entities, the image pattern is proven and can be replicated directly on the entity model.

The editor already supports inline image uploads via `POST /api/campaigns/:id/images` (stored in `content/campaigns/{slug}/images/`), but that is for embedded content images — not a "header image" or "entity image" that represents the entity itself.

## Goals / Non-Goals

**Goals:**
- Every entity type can have a single representative image (upload, store, serve, display)
- Consistent UX with the existing character portrait flow (click-to-upload, size variants, fallback placeholder)
- CLI parity: `entity upload-image` mirrors `character upload-portrait`
- Characters continue to use their existing `portraitUrl` on the `characters` table (no migration of existing data)

**Non-Goals:**
- Multiple images per entity (gallery) — out of scope
- Image cropping, resizing, or thumbnail generation — serve the uploaded file as-is
- Replacing the character portrait system — characters keep their own `portraitUrl` field and endpoints
- Image support in entity templates (custom field type `image`) — separate feature

## Decisions

### 1. Add `imageUrl` column to the `entities` table

The image URL is stored directly on the entity row, same pattern as `characters.portraitUrl`. This avoids a separate join table and keeps queries simple.

**Alternative considered:** Store the URL in the frontmatter `fields` object. Rejected because: it would require parsing YAML to check for images on list views, and it conflates schema-level data with user-defined template fields.

### 2. Store images at `content/campaigns/{campaignSlug}/entities/{entitySlug}/image.{ext}`

Mirrors the character pattern (`characters/{slug}/portrait.{ext}`). One image per entity, overwritten on re-upload.

**Alternative considered:** Store in `content/campaigns/{slug}/images/` alongside editor images. Rejected because: entity images need to be discoverable by slug, and mixing them with anonymous editor uploads complicates cleanup on entity deletion.

### 3. Create a generic `EntityImage.vue` component

Similar to `CharacterPortrait.vue` but with:
- Props: `imageUrl`, `name`, `editable`, `campaignId`, `entitySlug`, `size`
- Upload endpoint: `/api/campaigns/:id/entities/:slug/image`
- A generic image placeholder icon (lucide `ImageIcon`) instead of the person silhouette
- Same size variants: `sm` (w-10 h-10), `md` (w-24 h-24), `lg` (w-48 h-48)

**Alternative considered:** Make `CharacterPortrait.vue` generic and reuse it. Rejected because: the upload URL, field name, placeholder icon, and alt text all differ, making it cleaner as a separate component rather than adding conditional logic.

### 4. API endpoints mirror the character portrait pattern exactly

- `POST /api/campaigns/[id]/entities/[slug]/image.post.ts` — multipart upload, field name `image`, same MIME/size validation, editor+ role
- `GET /api/campaigns/[id]/entities/[slug]/image.get.ts` — serve with `Cache-Control: public, max-age=3600`

### 5. Characters use entity image as fallback (display only)

On entity list views, characters that have a `portraitUrl` display their portrait. For non-character entities, the new `imageUrl` is used. The character detail page continues to use `CharacterPortrait.vue`. The entity detail page uses `EntityImage.vue`.

If a character entity also has an `imageUrl` set (unlikely but possible), the character's `portraitUrl` takes precedence in list views.

### 6. CLI: `entity upload-image` subcommand

Mirrors `character upload-portrait`:
```
aleph entity upload-image --campaign <id> --slug <slug> --file <path>
```
Sends multipart POST to `/api/campaigns/:id/entities/:slug/image`.

## Risks / Trade-offs

- **Disk growth**: Each entity can now store an image up to 10 MB. No automatic cleanup if entity is deleted via markdown file removal (only DB cascade). Mitigation: entity deletion API handler should also delete the image directory.
- **Migration**: Adding a nullable column to `entities` is non-destructive (SQLite `ALTER TABLE ADD COLUMN`). No data migration needed. Risk is low.
- **Cache invalidation**: Re-uploading an image at the same URL may serve stale content due to `max-age=3600`. Mitigation: append `?t=timestamp` query param on the frontend after upload (same as current character portrait behavior).
