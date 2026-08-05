# Design: Entity Image Gallery for Characters and Organizations

## Context

The `add-location-image-gallery` change shipped an `entity_images` table:

| column       | type                   | notes                             |
| ------------ | ---------------------- | --------------------------------- |
| `id`         | text PK                | uuid; the on-disk filename stem   |
| `campaignId` | text NN → campaigns.id | cascade delete                    |
| `entityId`   | text NN → entities.id  | cascade delete                    |
| `filename`   | text NN                | `{id}.{ext}`                      |
| `url`        | text NN                | serve path (stable after write)   |
| `caption`    | text                   | nullable                          |
| `sortOrder`  | integer NN default 0   | ascending; `createdAt` tiebreak   |
| `isPrimary`  | integer(bool) NN false | partial unique index per entityId |
| `createdBy`  | text NN → user.id      |                                   |
| `createdAt`  | integer(timestamp) NN  |                                   |

It also shipped `server/services/entity-images.ts` with the primary invariant, ordering
helpers, and file-path utilities. Both are completely generic — the location gallery was the
first consumer, but everything was written for reuse.

Characters and organizations each have a **different** primary-image storage contract:

- **Characters**: `characters.portraitUrl` (on the `characters` table, not `entities`). Written
  by `portrait.post.ts`, served by `portrait.get.ts`. Files at
  `{contentDir}/characters/{slug}/portrait.{ext}`.
- **Organizations**: `organizations.imageUrl` (on the `organizations` table). Written by
  `organizations/[slug]/image.post.ts`, served by `image.get.ts`. Files at
  `{contentDir}/organizations/{slug}/image.{ext}`.

Neither of these mirrors `entities.imageUrl`, unlike locations. This affects how the primary
mirror is kept in sync: the gallery service must update the `characters` or `organizations`
table, not the `entities` table.

## Goals / Non-Goals

**Goals:**

- Many images per character and per organization, one per entity marked primary.
- `characters.portraitUrl` and `organizations.imageUrl` remain as derived mirrors of the
  primary, updated inside every gallery mutation transaction.
- Existing consumers of `portraitUrl` / `organizations.imageUrl` require zero changes.
- API route surfaces parallel to the location gallery — same verbs, same URL shape.
- Shared gallery component reused across characters, organizations (and locations if desired).
- Galleries survive export/import round-trips.
- aleph-cli commands mirror the location ones.

**Non-Goals:**

- Galleries for generic entities, sessions, quests, maps or any other type.
- Image processing (resize, thumbnail, EXIF stripping).
- Drag-and-drop reordering or lightbox UX.
- Deduplication of the same file uploaded twice.
- Any change to the `entity_images` table schema (it already exists).

## Decisions

### 1. Reuse `entity_images` and `entity-images.ts` with no schema migration

**Chosen.** The table already has `entityId → entities.id` as the FK. Both characters and
organizations are backed by an `entities` row, so inserting gallery rows for them requires no
table change. A new migration is needed only for the backfill of existing single images.

**Risk**: a character's entity id must be resolved before inserting into `entity_images`.
Characters are looked up by their `entities` slug like locations are, so the pattern is
identical.

### 2. Primary mirror updated in `characters` / `organizations`, not `entities`

**Chosen.** Locations mirror their primary into `entities.imageUrl`. Characters use
`characters.portraitUrl`; organizations use `organizations.imageUrl`. The gallery service
function that syncs the mirror accepts a callback (or entity-type discriminant) to know which
table to update. This keeps the invariant logic in one place while targeting the right column.

**Alternative rejected**: mirror into `entities.imageUrl` as well for characters and orgs.
Rejected because that would create two sources of truth for the same datum and require
auditing all consumers to pick the right column.

### 3. A single generic `EntityImageGallery.vue` component

**Chosen.** The location gallery's `LocationImageGallery.vue` accepts an `uploadUrl`, a list
API URL and a set of callbacks — it is already parameterized by URL. Rather than duplicating
it three times, introduce a `EntityImageGallery.vue` that accepts:

- `imagesUrl` — the list/upload endpoint base
- `editable` — boolean
- `primaryLabel` — i18n key for the primary badge

Location, character, and organization detail/edit pages all use this one component.
`LocationImageGallery.vue` becomes a thin wrapper (or is refactored to use the generic one
directly).

### 4. Existing `portrait.post.ts` and `image.post.ts` adapted, not removed

**Chosen.** Both endpoints (`POST .../portrait` and `POST .../organizations/:slug/image`) are
adapted to delegate to the gallery service (create or replace primary image) rather than
writing an orphan file. The response shape stays the same so existing callers (the UI
`CharacterPortrait.vue`, `EntityImage.vue`) need no changes.

**Alternative rejected**: leave the old endpoints as-is and add gallery endpoints in parallel.
Rejected because two write paths fighting over `portraitUrl`/`imageUrl` is exactly the
anti-pattern the location spec avoided.

### 5. Backfill migration copies, not moves

**Chosen.** The backfill walks every character with a non-null `portraitUrl` and every
organization with a non-null `imageUrl`, copies the file into the new gallery directory
`{contentDir}/{characters|organizations}/{slug}/images/{newId}.{ext}`, and inserts the
`entity_images` row. The old file at `portrait.{ext}` / `image.{ext}` is left in place until
manually cleaned up. The migration is idempotent (skips entityIds already in `entity_images`).

**Why copy not move**: if the migration is run on a live instance while the old serve routes
are still active, a move would 404 any in-flight portrait request. Copy is safe; the old serve
routes remain readable until the new endpoints are confirmed working.

## Risks / Trade-offs

- **`characters.portraitUrl` is on a different table than `entities.imageUrl`.** The gallery
  service needs to know which table to update. Mitigation: a small `entityType` parameter
  (`'character' | 'organization'`) in the sync function routes to the right UPDATE statement.
- **The old portrait.get / image.get routes still serve the pre-gallery file.** After backfill,
  the canonical URL changes from `/portrait` to `/images/{id}`. Existing `portraitUrl` values
  in the DB are updated by the backfill to point at the new URL. Old single-file serve routes
  (`portrait.get.ts`, `image.get.ts`) continue to work for any cached reference until the old
  files are cleaned up — this is intentional graceful degradation.
- **Export collector must walk new URL shapes.** Gallery image URLs look like
  `/api/campaigns/{id}/characters/{slug}/images/{imageId}` — a different shape from the
  existing fields the collector walks. Mitigation: the collector is extended to iterate
  `characterImages` and `organizationImages` arrays (same pattern as `locationImages`).
- **Two mutations, one transaction.** The primary-mirror sync and the `entity_images` write
  must be atomic. The existing service already does this for locations; the pattern carries
  over unchanged.

## Migration Plan

1. Deploy the code change (new routes, adapted portrait/image endpoints, gallery component,
   CLI commands, export/import extensions).
2. Run the migration: backfill `entity_images` rows for existing characters and organizations.
   The migration is idempotent and can be re-run safely.
3. The old `portrait.get.ts` and `image.get.ts` serve routes remain active for graceful
   degradation of any cached `portraitUrl` / `imageUrl` values that predate the backfill.
4. After confirming the migration on production, the old single-file uploads (`portrait.{ext}`,
   `image.{ext}`) can be deleted from disk in a separate cleanup step (out of scope here).

## Open Questions

- Should `LocationImageGallery.vue` be refactored to delegate to `EntityImageGallery.vue` in
  this same change, or left as a parallel component? (Low-risk either way; the spec does not
  mandate a refactor of the location component.)
- The backfill migration needs to determine the `ext` of existing portrait/image files by
  scanning the filesystem. Should it fall back to `.png` if no file is found, or skip the row
  entirely? (Proposed: skip — don't create a gallery row for an imageUrl whose file doesn't
  exist, consistent with the location backfill rule.)
