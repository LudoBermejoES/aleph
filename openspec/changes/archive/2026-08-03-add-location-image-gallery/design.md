## Context

Aleph stores at most one image per wiki entity: `entities.imageUrl`
(`server/db/schema/entities.ts:18`), a nullable text column holding an API path. The upload
route (`server/api/campaigns/[id]/entities/[slug]/image.post.ts`) validates MIME type by
declared type **and** magic bytes, caps at 10 MB, and writes to a fixed filename
`{contentDir}/entities/{slug}/image.{ext}` — so a second upload destroys the first by design.
The serve route sets `Cache-Control: public, max-age=3600`.

Locations are not a separate table. A location is an `entities` row with `type = 'location'`,
exposed through a dedicated API surface (`server/api/campaigns/[id]/locations/`) and dedicated
pages (`app/pages/campaigns/[id]/locations/`). This matters for the design in two ways:

1. Locations already **have** an `imageUrl` column and some campaigns already have values in
   it, set from the generic entity edit page. The gallery cannot pretend the field is empty.
2. Locations render **no** image today. The detail page has no `<img>` and no `EntityImage`;
   the list endpoint's explicit column select (`.../locations/index.get.ts:43-58`) omits
   `imageUrl` entirely. So the detail endpoint's `...entity` spread returns the field, and no
   UI consumes it.

Two constraints shape everything below. First, `entities.imageUrl` is read from many places
that this change must not have to find and update — the graph builder, campaign export, map-pin
popovers, search. Second, campaign export/import must stay lossless: the images collector
(`server/services/campaign-export.ts:110-112`) walks a hard-coded list of image-bearing fields,
and anything not in that list exports as a dead link with no error.

One useful fact, verified rather than assumed: **a location's slug is immutable after
creation.** `server/api/campaigns/[id]/locations/[slug].put.ts` never writes `entities.slug`; a
rename changes only `name`. Slug-based image URLs and slug-based on-disk paths are therefore
stable, which is what lets this design keep the existing URL convention.

## Goals / Non-Goals

**Goals:**

- Many images per location, each with an optional caption, in an editor-controlled order.
- Exactly one image designated primary, enforced by the database, not by application discipline.
- Every existing reader of `entities.imageUrl` shows the primary with zero code change.
- No state in which the gallery and `entities.imageUrl` disagree — one writer, one invariant.
- Locations get a visible image surface: thumbnail in the list, gallery on the detail page,
  management on the edit page.
- Galleries survive an export/import round-trip, files included.
- Nothing visible today disappears: existing location `imageUrl` values become gallery rows.

**Non-Goals:**

- Galleries for characters (`portraitUrl`), organizations, session groups, or generic entities.
  The storage table is deliberately entity-generic so a later change can widen it without a
  second migration, but no other type gains a gallery here.
- Image processing — no resizing, thumbnail generation, EXIF stripping, or format conversion.
  Files are served as uploaded, exactly as the existing entity image route does.
- Per-image visibility or secrets. An image is as visible as its location.
- Reordering by drag-and-drop across pages, lightbox zoom UX polish, or slideshow. The order is
  editable; the presentation stays a simple grid.
- Deduplicating the same file uploaded twice.

## Decisions

### 1. A new `entity_images` table, not a JSON array

**Chosen:** a real table, `entity_images`, one row per image:

| column       | type                      | notes                                                 |
| ------------ | ------------------------- | ----------------------------------------------------- |
| `id`         | text PK                   | uuid; also the on-disk filename stem                  |
| `campaignId` | text NN → campaigns.id    | cascade delete; lets export scope by campaign cheaply |
| `entityId`   | text NN → entities.id     | cascade delete; the location                          |
| `filename`   | text NN                   | `{id}.{ext}` as written to disk                       |
| `url`        | text NN                   | the serve path, stored so export can key on it        |
| `caption`    | text                      | nullable                                              |
| `sortOrder`  | integer NN default 0      | ascending; ties broken by `createdAt`                 |
| `isPrimary`  | integer(boolean) NN false | at most one true per `entityId` — see decision 2      |
| `createdBy`  | text NN → user.id         |                                                       |
| `createdAt`  | integer(timestamp) NN     |                                                       |

Indexes: `index('idx_entity_images_entity').on(entityId, sortOrder)` for the list path, plus the
partial unique index from decision 2.

**Alternatives considered.** _Images as a JSON array in the markdown frontmatter_ — locations
already carry `fields` in frontmatter, so it looks free. Rejected: the export image collector,
the list endpoint and any future join would each have to parse markdown off disk per row, which
the list endpoint already pays for `subtype` and which is the slowest thing it does
(`.../locations/index.get.ts` reads every location's file). Adding image data to that read makes
a known cost worse. _A `location_images` table_ — rejected only because the entity-generic name
costs nothing today and saves a migration later; nothing in this change treats a non-location
entity as having a gallery.

### 2. Primary as `isPrimary` + a partial unique index, not `entities.primaryImageId`

**Chosen:** a boolean on the image row, with

```sql
CREATE UNIQUE INDEX entity_images_one_primary ON entity_images (entity_id) WHERE is_primary = 1;
```

Drizzle expresses this as `uniqueIndex('entity_images_one_primary').on(table.entityId).where(sql\`is_primary = 1\`)`.

"Which one is the main one" is the feature the user asked for, so the invariant deserves to be
unbreakable rather than merely respected. The partial index makes a second primary a database
error, not a bug that surfaces months later as a location showing two different pictures in two
places.

**Alternatives considered.** _`entities.primaryImageId` FK_ — expresses "one primary" naturally
and needs no partial index, but adds a second column to the already-wide `entities` table, needs
`ON DELETE SET NULL` handling, and makes the "promote another image when the primary is deleted"
rule a cross-table operation. _No enforcement, just "the row with `sortOrder = 0`"_ — conflates
order with primacy; the user explicitly wants to pick a main image independently of where it sits
in the grid.

**Setting the primary is a two-statement transaction**: clear `isPrimary` for the entity, then
set it on the target. Both statements plus the `imageUrl` sync (decision 3) run in one
`db.transaction()` — a partial application is the exact state the index exists to prevent.

### 3. `entities.imageUrl` is a derived mirror, with exactly one writer

**Chosen:** `entities.imageUrl` always equals the URL of the location's primary image, or `null`
when the gallery is empty. A single service function owns it:

```
syncPrimaryImageUrl(db, entityId)  // in server/services/entity-images.ts
```

called inside the same transaction as every gallery mutation (upload, delete, set-primary).

This is what makes the change cheap. The graph builder, campaign export, map-pin popovers,
search results and the entity list all read `imageUrl` today; none of them learns that galleries
exist. The alternative — teaching every consumer to resolve a primary image — is a large diff
whose failure mode is a surface that silently keeps showing a stale picture.

**Alternatives considered.** _Drop `imageUrl` for locations and have consumers join_ — correct in
the normalised sense, wrong in the practical one: it is a breaking change to every reader and to
the export format, for no user-visible gain. _Keep both writable and reconcile lazily_ — that is
the drift this decision exists to forbid.

**The consequence, and it is the sharp edge of this design:** `POST /entities/:slug/image`
currently writes `imageUrl` directly. Left alone, it becomes a second writer and the mirror
stops being a mirror. So for `type = 'location'` that route must delegate to the gallery service
— creating a gallery row and marking it primary — rather than writing `image.{ext}`. Every other
entity type keeps its current code path byte for byte. A test asserts that a location image
uploaded through the **entity** route appears in the **gallery** listing; without that test this
decision is a comment, not a guarantee.

### 4. Storage layout and URL shape

**On disk:** `{campaign.contentDir}/locations/{slug}/images/{imageId}.{ext}` — a directory per
location, one file per image, uuid filenames so a re-upload of the same filename cannot collide.
Safe because the slug is immutable (see Context).

**URL:** `/api/campaigns/:id/locations/:slug/images/:imageId` — nested under the location, matching
the existing `/api/campaigns/:id/entities/:slug/image` convention. `Cache-Control: public,
max-age=31536000` rather than the entity route's `3600`: a uuid URL addresses one immutable
file, so the year-long cache used by `/api/campaigns/:id/images/:filename`
(`editor-image-upload`) is the right precedent.

**Validation** is copied, not reinvented, from `entities/[slug]/image.post.ts`: PNG/JPEG/WebP
only, declared MIME **and** `detectMimeFromBytes()` magic-byte check, 10 MB cap. GIF is excluded
here for the same reason the entity route excludes it, even though the editor upload route allows
it — matching the sibling surface beats matching the distant one.

### 5. Ordering

`sortOrder` ascending, `createdAt` ascending as the tiebreak so the list is deterministic even
if two rows share a `sortOrder` (which the API permits — no unique constraint on order). New
uploads append with `sortOrder = max + 1`. Reorder is a `PATCH` per image rather than a bulk
array-swap endpoint; it is fewer moving parts and the gallery sizes here are small.

### 6. Export and import

Two separate gaps, both real:

- **The rows.** `campaign-export` gains a `locationImages` array. Import recreates the rows,
  remapping `entityId` through the existing entity id map.
- **The files.** `campaign-export-images` embeds files as base64 data URIs into an `images` map
  keyed by original URL, from a hard-coded field walk
  (`server/services/campaign-export.ts:110-112`). That walk gains the gallery `url` values, and
  the import-side `rewriteImageUrl()` treatment gains the gallery rows. Miss either half and a
  gallery imports as dead `<img>` tags with a 200-response export.

The gate is a round-trip integration test — export a campaign with a multi-image location,
import it, assert the gallery, the primary, the captions, the order **and** that the files exist
on disk under the new campaign — not a review of the export diff.

## Risks / Trade-offs

- **Two writers to `entities.imageUrl`** (the gallery and the legacy entity image route) →
  the entity route delegates to the gallery service for `type = 'location'`; asserted by an
  integration test that uploads via the entity route and reads the gallery.
- **The mirror drifting under a raw SQL fix or a future endpoint** → the mirror is only ever
  written by `syncPrimaryImageUrl()`, and a unit test asserts that deleting the primary promotes
  the next image and updates `imageUrl` in the same transaction. There is no protection against
  someone writing `imageUrl` by hand in a future route; that is a review concern, and it is why
  the sync lives in a service rather than inline in a handler.
- **Deleting the primary leaves the location primary-less** → delete promotes the
  lowest-`sortOrder` survivor to primary and re-syncs; when the gallery empties, `imageUrl`
  becomes `null`. Both are scenarios in the spec, not implementation notes.
- **The backfill copying files wrongly, or twice** → the migration copies (never moves) the
  existing `entities/{slug}/image.{ext}` into the new layout and is written to be idempotent: a
  location that already has a gallery row is skipped. The old file stays on disk. Re-running the
  migration must be a no-op, and a test asserts it.
- **Orphan files after a delete** → row deletion unlinks the file; a failed unlink is logged and
  does not fail the request, because a stale file is harmless and a 500 on delete is not. This
  is a deliberate asymmetry: the DB row is the truth, the file is a cache of bytes.
- **Location list cost** → the list endpoint already reads every location's markdown file for
  `subtype`. Adding `imageUrl` to the existing column select costs nothing extra (no join, no
  file read) precisely because of decision 3. The gallery is never loaded in the list.
- **10 MB × N.** One image per location capped the storage a campaign could consume. A gallery
  removes that ceiling with no quota to replace it. Called out rather than solved; a per-campaign
  storage quota is a separate change and would be wrong to bolt on here.

## Migration Plan

1. Add the `entityImages` table and the two indexes; generate the Drizzle migration.
2. In the same migration, backfill: for every `entities` row with `type = 'location'` and a
   non-null `imageUrl` and no existing gallery row, insert one row with `isPrimary = 1`,
   `sortOrder = 0`, `url` = the existing `imageUrl`, and copy the file into the new layout.
   Idempotent — re-running skips locations that already have rows.
3. Ship the service + endpoints. The mirror invariant holds from the first write.
4. Ship the UI and the list `imageUrl` (safe in either order — the API is additive).
5. Ship the export/import changes and the round-trip test.
6. Ship the CLI commands and both skill files together.

**Rollback:** the feature is additive. Reverting the app code leaves the `entity_images` table
populated and `entities.imageUrl` pointing at a file that still exists, so locations fall back to
the pre-change single-image behaviour with the primary still displayed. Dropping the table is
only necessary if the schema itself is being reverted, and it loses the non-primary images —
the files remain on disk under `locations/{slug}/images/`.

## Resolved During Implementation

- **Should a `visitor` see the gallery?** **Yes**, as assumed. Read access is delegated to
  `resolveReadableLocation()`, which is the same visibility path the location detail endpoint
  uses, so an image is exactly as visible as its location and no separate role rule exists to
  drift.
- **Caption length.** **500 characters**, enforced by the PATCH zod schema and by `maxlength` on
  the input. Nothing in the grid breaks below that.
- **Should the character portrait and organization image later fold into `entity_images`?** Still
  deliberately undecided. The table is entity-generic and ready for it.

### Two things the design got wrong, corrected in code

- **The backfill cannot live in the `.sql` migration.** It copies files, and a Drizzle SQL
  migration cannot. It is `server/db/backfills/location-images.ts`, invoked from
  `server/plugins/migrations.ts` immediately after `migrate()`, and it runs on every boot — which
  is exactly why it had to be idempotent anyway. A failure is logged and does not block startup:
  a missing gallery row is recoverable, a server that refuses to start is not.
- **The export format is a ZIP (`version: "1.2"`), not the base64 JSON the `campaign-export-images`
  spec still describes as `"1.1"`.** That spec was already stale before this change. Consequences
  the design missed:
  - `buildCampaignExportZip` derives a ZIP entry name per URL shape, and its generic
    `/images/([^/?]+)$` pattern **also matches a gallery URL**. Left alone, gallery files would
    have been packed as plain campaign images and restored into `contentDir/images/`, where the
    gallery serve route does not look. Gallery URLs are therefore matched **first**, into
    `images/location-image-{id}.{ext}`.
  - There are **three** import paths, not one: the v1.1 JSON importer, the buffered ZIP importer,
    and the streaming ZIP importer. All three needed the gallery branch. The two ZIP paths share
    `placeGalleryImage()`.
  - The ZIP importers run `importCampaign()` **before** they write files, so the gallery rows
    already exist with remapped ids while the ZIP entry names still carry the source ids.
    `galleryRowsByOldUrl()` bridges the two by keying the freshly-inserted rows on the URL they
    were imported with.
- **Gallery ids are remapped on import.** The design implied keeping them, which would make a
  second import of the same export collide on the `entity_images` primary key. `buildIdMap()`
  registers them, and `extractAndWriteImages()` takes the id map so the file name, the row id and
  the URL all agree. A test imports one export twice.
