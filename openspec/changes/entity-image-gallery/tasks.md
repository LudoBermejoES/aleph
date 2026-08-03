## 1. Database Migration — Backfill

- [x] 1.1 Write a new Drizzle migration that walks every `characters` row with a non-null `portraitUrl`, copies the existing `portrait.{ext}` file to `{contentDir}/characters/{slug}/images/{newId}.{ext}`, inserts an `entity_images` row with `isPrimary = 1`, `sortOrder = 0`, and updates `characters.portraitUrl` to the new gallery URL. Skip rows already present in `entity_images`. Skip rows whose source file does not exist on disk.
- [x] 1.2 Write a second migration (or extend 1.1) to do the same for every `organizations` row with a non-null `imageUrl`, copying from `{contentDir}/organizations/{slug}/image.{ext}` to `{contentDir}/organizations/{slug}/images/{newId}.{ext}` and updating `organizations.imageUrl`.
- [ ] 1.3 Verify both migrations are idempotent by running them twice locally and confirming no duplicates.
- [x] 1.4 Add the new migration files to `server/db/migrations/_journal.json` with timestamps greater than the existing `add-location-image-gallery` migration.

## 2. Gallery Service Extension

- [x] 2.1 Extend `server/services/entity-images.ts` to accept an `entityType` discriminant (`'character' | 'organization' | 'location'`) in the primary-mirror sync function so it knows to update `characters.portraitUrl`, `organizations.imageUrl`, or `entities.imageUrl` respectively.
- [x] 2.2 Add a `client.js` `patch()` helper to `cli/src/lib/client.js` if it does not already exist (needed for `PATCH` image endpoints).

## 3. Character Gallery API Routes

- [x] 3.1 Create `server/api/campaigns/[id]/characters/[slug]/images/index.get.ts` — list character images, minimum role: member.
- [x] 3.2 Create `server/api/campaigns/[id]/characters/[slug]/images/index.post.ts` — upload a new image, field name `image`, optional `caption`; first upload is primary; file at `{contentDir}/characters/{slug}/images/{id}.{ext}`; minimum role: editor.
- [x] 3.3 Create `server/api/campaigns/[id]/characters/[slug]/images/[imageId].get.ts` — serve image bytes with `Cache-Control: public, max-age=31536000`; minimum role: member.
- [x] 3.4 Create `server/api/campaigns/[id]/characters/[slug]/images/[imageId].patch.ts` — update `caption`, `sortOrder`, or `isPrimary`; setting primary clears others and updates `characters.portraitUrl`; reject `{ isPrimary: false }` on current primary; minimum role: editor.
- [x] 3.5 Create `server/api/campaigns/[id]/characters/[slug]/images/[imageId].delete.ts` — delete row and file; promote lowest-`sortOrder` survivor if primary deleted; update `characters.portraitUrl`; return 204; minimum role: editor.
- [x] 3.6 Adapt `server/api/campaigns/[id]/characters/[slug]/portrait.post.ts` to delegate to the gallery service (create or replace primary gallery image) instead of writing an orphan `portrait.{ext}` file directly.

## 4. Organization Gallery API Routes

- [x] 4.1 Create `server/api/campaigns/[id]/organizations/[slug]/images/index.get.ts` — list organization images, minimum role: member.
- [x] 4.2 Create `server/api/campaigns/[id]/organizations/[slug]/images/index.post.ts` — upload, field name `image`, optional `caption`; first upload is primary; file at `{contentDir}/organizations/{slug}/images/{id}.{ext}`; minimum role: editor.
- [x] 4.3 Create `server/api/campaigns/[id]/organizations/[slug]/images/[imageId].get.ts` — serve with long-lived cache; minimum role: member.
- [x] 4.4 Create `server/api/campaigns/[id]/organizations/[slug]/images/[imageId].patch.ts` — update `caption`, `sortOrder`, or `isPrimary`; updates `organizations.imageUrl` on primary change; minimum role: editor.
- [x] 4.5 Create `server/api/campaigns/[id]/organizations/[slug]/images/[imageId].delete.ts` — delete row and file; promote survivor; update `organizations.imageUrl`; return 204; minimum role: editor.
- [x] 4.6 Adapt `server/api/campaigns/[id]/organizations/[slug]/image.post.ts` to delegate to the gallery service instead of writing `image.{ext}` directly.

## 5. Shared Gallery UI Component

- [x] 5.1 Create `app/components/EntityImageGallery.vue` accepting props: `imagesUrl` (string), `editable` (boolean), `primaryLabel` (i18n key). Renders a grid of images in `sortOrder` order, marks the primary, shows captions, and — when editable — provides upload, set-primary, edit-caption, and delete controls. Panel is hidden when the gallery is empty and `editable` is false.
- [x] 5.2 Add i18n keys for all gallery labels, buttons, and error messages to `i18n/locales/en.json` and `i18n/locales/es.json`.

## 6. Character UI

- [x] 6.1 Add an Images panel to `app/pages/campaigns/[id]/characters/[slug]/index.vue` using `EntityImageGallery.vue`, passing the list/upload URL and the user's edit permission.
- [x] 6.2 Add the same Images panel to `app/pages/campaigns/[id]/characters/[slug]/edit.vue`.
- [x] 6.3 Ensure the character header portrait (`CharacterPortrait.vue` or equivalent) reactively reflects `portraitUrl` so it updates when the primary changes without a full reload.

## 7. Organization UI

- [x] 7.1 Add an Images panel to `app/pages/campaigns/[id]/organizations/[slug]/index.vue` using `EntityImageGallery.vue`.
- [x] 7.2 Add the same Images panel to `app/pages/campaigns/[id]/organizations/[slug]/edit.vue` (if an edit page exists).
- [x] 7.3 Ensure the organization header image reactively reflects `organizations.imageUrl` when the primary changes.

## 8. Export / Import Extension

- [x] 8.1 Extend `server/services/campaign-export.ts` to include `characterImages` and `organizationImages` arrays in the export payload (same shape as `locationImages`).
- [x] 8.2 Extend the images collector in `campaign-export.ts` to walk `characterImages[*].url` and `organizationImages[*].url` when building the `images` base64 map.
- [x] 8.3 Extend `server/services/campaign-import.ts` to restore `characterImages` and `organizationImages` rows: write files to disk, remap `entityId`, rewrite `url`, and re-sync `characters.portraitUrl` / `organizations.imageUrl` from the restored primaries.
- [x] 8.4 Ensure import of exports produced before this change (no `characterImages` / `organizationImages` keys) succeeds without error.

## 9. aleph-cli

- [x] 9.1 Add `character images <slug>`, `character image-add <slug> --file <path> [--caption <text>]`, `character image-update <slug> <imageId> [--caption <text>] [--order <n>]`, `character image-set-primary <slug> <imageId>`, and `character image-remove <slug> <imageId>` to `cli/src/commands/character.js`.
- [x] 9.2 Add the same five subcommands for organizations to `cli/src/commands/organization.js`.
- [x] 9.3 Update `docs/claude-skill.md` to document all ten new commands.
- [x] 9.4 Update `.claude/skills/aleph-cli/SKILL.md` to document all ten new commands and bump the `version` field in the frontmatter.

## 10. Tests

- [x] 10.1 Write unit tests for the gallery service functions covering character and organization entity types (primary sync, promotion on delete, ordering).
- [x] 10.2 Write integration tests for each new character gallery endpoint (list, upload, serve, patch, delete) — requires server on port 3333.
- [x] 10.3 Write integration tests for each new organization gallery endpoint.
- [x] 10.4 Write integration tests for the adapted `portrait.post.ts` and `image.post.ts` routes to confirm they create gallery rows and update the mirror column.
- [x] 10.5 Write integration tests for the export/import round-trip: export a campaign with character and org galleries, import into a new campaign, verify galleries are restored with correct primaries and all images are readable.
- [x] 10.6 Write an E2E test covering the golden path: editor uploads a second portrait on a character detail page, sets it as primary, and verifies the header portrait updates.
