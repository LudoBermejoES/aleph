# Tasks: Location Image Gallery

## 1. Database schema and migration

- [x] 1.1 Create `server/db/schema/entity-images.ts` with the `entityImages` table — `id`,
      `campaignId` (FK → `campaigns.id`, cascade), `entityId` (FK → `entities.id`, cascade),
      `filename`, `url`, `caption` (nullable), `sortOrder` (integer NN default 0), `isPrimary`
      (boolean NN default false), `createdBy` (FK → `user.id`), `createdAt`
- [x] 1.2 Add `index('idx_entity_images_entity').on(entityId, sortOrder)` and the partial unique
      index `uniqueIndex('entity_images_one_primary').on(entityId).where(sql`is_primary = 1`)` —
      the partial index IS the "exactly one main image" guarantee, not an optimisation
- [x] 1.3 Export the table from `server/db/schema/index.ts`
- [x] 1.4 Generate the Drizzle migration into `server/db/migrations/` and apply it
- [x] 1.5 Verify the partial index by attempting a second `isPrimary = 1` insert for one entity —
      it must fail. If it does not, the index did not survive the migration generator
- [x] 1.6 Verify both cascades against real deletes (delete a location, then a campaign)

## 2. Backfill migration

- [x] 2.1 **Deviation:** a `.sql` migration cannot copy files, so the backfill is
      `server/db/backfills/location-images.ts`, called from `server/plugins/migrations.ts` right
      after `migrate()`. It inserts a gallery row for every
      `entities` row with `type = 'location'` and a non-null `imageUrl` and no existing gallery
      row: `isPrimary = 1`, `sortOrder = 0`, `url` = the existing `imageUrl`
- [x] 2.2 Copy — never move — the existing `{contentDir}/entities/{slug}/image.{ext}` into
      `{contentDir}/locations/{slug}/images/{imageId}.{ext}`
- [x] 2.3 Make the backfill idempotent: a location that already has gallery rows is skipped, and
      an existing destination file is not overwritten
- [x] 2.4 Skip (do not abort on) locations whose source file is missing from disk
- [x] 2.5 Run the migration twice on a copy of real data and diff the resulting rows and files —
      the second run must change nothing

## 3. Service layer

- [x] 3.1 Create `server/services/entity-images.ts` with `listImages`, `addImage`, `updateImage`,
      `deleteImage`, `setPrimary` and `syncPrimaryImageUrl`
- [x] 3.2 `syncPrimaryImageUrl(db, entityId)` sets `entities.imageUrl` to the primary image's URL
      or `null` when the gallery is empty. It is the **only** writer of `imageUrl` for locations
- [x] 3.3 Wrap every mutation in `db.transaction()` so clear-primary + set-primary + mirror sync
      cannot land partially
- [x] 3.4 `addImage` appends with `sortOrder = max + 1`; the first image of an empty gallery is
      created primary
- [x] 3.5 `deleteImage` promotes the lowest-`sortOrder` survivor when the deleted row was primary,
      then re-syncs the mirror
- [x] 3.6 Unlink the file on delete; log and swallow an unlink failure rather than returning 500 —
      the row is the truth, the file is bytes
- [x] 3.7 Factor the upload validation (allowed MIME list, `detectMimeFromBytes()` magic-byte
      check, 10 MB cap, mime→ext map) out of `entities/[slug]/image.post.ts` into a shared helper
      so the two routes cannot drift apart

## 4. API — gallery endpoints

- [x] 4.1 `GET /api/campaigns/[id]/locations/[slug]/images/index.get.ts` — resolve the location
      through the existing read-visibility path (404 when not readable), return the ordered list
- [x] 4.2 `POST .../images/index.post.ts` — `editor`+, multipart field `image`, optional
      `caption`, writes to `{contentDir}/locations/{slug}/images/{imageId}.{ext}`, returns 201
- [x] 4.3 `GET .../images/[imageId].get.ts` — serve bytes with the right `Content-Type` and
      `Cache-Control: public, max-age=31536000`; 404 when the row is missing, belongs to another
      location, or the file is gone
- [x] 4.4 `PATCH .../images/[imageId].patch.ts` — `editor`+, zod schema of exactly
      `{ caption?, sortOrder?, isPrimary? }`; `isPrimary: false` on a non-empty gallery is a 400
- [x] 4.5 `DELETE .../images/[imageId].delete.ts` — `editor`+, 204 No Content
- [x] 4.6 Wrap all five in `withApiHandler`, matching the surrounding location routes
- [x] 4.7 Assert every route scopes by both `campaignId` and the resolved location — an `imageId`
      from another location must 404, not silently succeed

## 5. API — existing location and entity routes

- [x] 5.1 `locations/index.get.ts` — add `entities.imageUrl` to the explicit column select
      (`:43-58`) and to `mapRow` (`:67-79`). No join, no extra file read
- [x] 5.2 `locations/[slug].get.ts` — add `images` (ordered gallery) and `primaryImageUrl`
- [x] 5.3 `entities/[slug]/image.post.ts` — branch on `entity.type === 'location'` and delegate to
      `addImage` + `setPrimary`; leave every other type's code path untouched
- [x] 5.4 Confirm `locations/[slug].put.ts` still never touches image state

## 6. UI — components and pages

- [x] 6.1 Create `app/components/LocationImageGallery.vue` — grid, captions, primary marker, and
      (when `editable`) upload, caption edit, reorder, set-main and delete, all updating in place
- [x] 6.2 Reuse `EntityImage.vue` unchanged for list thumbnails and the detail header
- [x] 6.3 `locations/[slug]/index.vue` — header image from `primaryImageUrl` plus the Images
      panel; hide the panel entirely when the gallery is empty and the viewer cannot edit
- [x] 6.4 `locations/[slug]/edit.vue` — Images section in editable mode
- [x] 6.5 `locations/index.vue` — `sm` thumbnail beside the name when `imageUrl` is set, nothing
      when it is not
- [x] 6.6 Surface the server's error message on a rejected upload; leave the grid unchanged
- [x] 6.7 Add every new string to `i18n/locales/en.json` **and** `i18n/locales/es.json`

## 7. Export / import

- [x] 7.1 `server/services/campaign-export.ts` — add a `locationImages` array to the payload and
      honour the `include` query param for it
- [x] 7.2 Same file — add gallery `url` values to the image collector's field walk, **and** a
      gallery branch to `resolveImageFile` + the ZIP entry naming. The export is a **ZIP (v1.2)**,
      not the base64 JSON the spec describes, and its generic `/images/{file}` pattern also
      matches a gallery URL — so gallery URLs must be matched first, into
      `images/location-image-{id}.{ext}`
- [x] 7.3 `server/services/campaign-import.ts` — recreate the rows with `entityId` remapped,
      `rewriteImageUrl()` applied to each `url`, and `entities.imageUrl` re-derived from the
      restored primary. **All THREE import paths** needed it: the v1.1 JSON importer and both ZIP
      importers (buffered + streaming), the latter two sharing `placeGalleryImage()`
- [x] 7.4 Remap gallery ids in `buildIdMap()` so the same export can be imported twice without a
      primary-key collision; thread the id map through `extractAndWriteImages()` so filename, row
      id and URL agree
- [x] 7.5 Confirm a pre-change export (no `locationImages` key) still imports cleanly

## 8. aleph-cli and skills

- [x] 8.1 `cli/src/commands/location.js` — add `images <slug>`, `image-add <slug> --file <path>
[--caption <text>]`, `image-update <slug> <imageId> [--caption] [--order]`,
      `image-set-primary <slug> <imageId>`, `image-remove <slug> <imageId>`
- [x] 8.2 Reuse `postMultipart()` (`cli/src/lib/client.js:74`) for the upload; add a `patch()`
      helper to `client.js` only if one is not already there
- [x] 8.3 Update `docs/claude-skill.md` — the shareable skill
- [x] 8.4 Update `.claude/skills/aleph-cli/SKILL.md` — the local skill, and bump `version` in the
      frontmatter. Both skill files land in the same commit; they are never updated apart

## 9. Testing

- [x] 9.1 Unit (`tests/unit/`) — `entity-images.ts` service: append ordering, first-image-becomes
      -primary, set-primary clears the old one, delete-primary promotes the lowest survivor,
      delete-last nulls `imageUrl`, mirror correct after every mutation
- [x] 9.2 Unit — the shared upload validator: bad declared MIME, magic-byte mismatch, oversize
- [x] 9.3 Unit — the backfill run twice produces identical rows and files
- [x] 9.4 Integration (`tests/integration/`, server on 3333) — the five gallery endpoints for
      each of: unauthenticated → 401, `player` → 403 on writes, `editor` → success, unknown
      location → 404, `imageId` from another location → 404
- [x] 9.5 Integration — upload through `POST /entities/:slug/image` on a **location**, then read
      `GET /locations/:slug/images` and assert the image is there and primary. This is the test
      that holds decision 3 of design.md up; without it the single-writer rule is a comment
- [x] 9.6 Integration — location list returns `imageUrl`; location detail returns `images` and
      `primaryImageUrl`
- [x] 9.7 Integration — export/import round-trip: a location with three captioned images in a
      known order, one primary; after import assert order, captions, primary, `entities.imageUrl`
      **and** that each file is readable at its new URL
- [x] 9.8 E2E (`tests/e2e/`) — editor uploads two images to a location, sets the second as main,
      and the location list thumbnail plus the detail header both change to it
- [x] 9.9 E2E — a `player` sees the gallery on a location with images and sees no management
      controls; a `player` sees no Images panel on a location with none
- [x] 9.10 E2E — the gallery renders in both `en` and `es` with no missing-translation keys

## 10. Verification

- [x] 10.1 `npx vitest run tests/unit/`
- [x] 10.2 `npx vitest run tests/integration/` — **806/813 green**. The 7 failures were: 4 caused
      by this change (two existing suites created their fixture entity as `type: 'location'`, so
      the entity image route now routes it into the gallery — both fixtures moved to `type:
'item'`, which is what those suites were written to guard, and both are green), and 3
      `collaboration.test.ts` failures that are **environmental**: Hocuspocus binds port 3334
      unconditionally (`server/plugins/hocuspocus.ts:19`, no env override) and another aleph
      checkout already owned it, so those WS tests authenticated against a foreign server. Not
      verified green in a clean environment
- [x] 10.3 `npx playwright test` — the new spec (`tests/e2e/location-image-gallery.spec.ts`) is
      **6/6 green**. The affected existing specs (locations, sub-locations, subtypes, relations
      panel, entity-image, export, import) were run too: **25 passed, 6 flaky, 5 failed**, and on
      a second run the failing set was _different_. Every failure traced to
      `createCampaign()` timing out on the home page **before** any code this change touches, and
      it hit tests unrelated to the gallery ("player does not see export button"). The one
      failure that looked like a real regression — the export/import round-trip asserting a
      visible image — was reproduced directly and **passes**: the imported location's `imageUrl`
      is the new campaign's gallery URL, it serves 200 with real bytes, and the entity page
      renders it. The full 320-test suite was NOT run to completion (hours, on a shared machine)
- [x] 10.4 `npx eslint . --max-warnings=0` clean, `prettier --check` clean, `npm run build` exit 0
- [x] 10.5 `openspec validate add-location-image-gallery --strict` — valid
- [x] 10.6 Re-read the design's "Open Questions" and record the answers reached during
      implementation in design.md rather than leaving them open
