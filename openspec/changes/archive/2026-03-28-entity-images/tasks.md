## 1. Schema & Migration

- [x] 1.1 Add `imageUrl` nullable text column to the `entities` table in `server/db/schema/entities.ts`
- [x] 1.2 Generate and verify the Drizzle migration (`npx drizzle-kit generate`)
- [x] 1.3 Run the migration (`npx drizzle-kit push` or restart dev server) and confirm the column exists

## 2. API Endpoints

- [x] 2.1 Create `server/api/campaigns/[id]/entities/[slug]/image.post.ts` — multipart upload (field `image`), validate MIME (png/jpeg/webp) and size (10 MB), store at `{contentDir}/entities/{slug}/image.{ext}`, update `entities.imageUrl`, return `{ imageUrl }`
- [x] 2.2 Create `server/api/campaigns/[id]/entities/[slug]/image.get.ts` — serve image from disk with correct `Content-Type` and `Cache-Control: public, max-age=3600`
- [x] 2.3 Update `GET /api/campaigns/[id]/entities/[slug]` (detail) to include `imageUrl` in the response (already included via `...entity` spread)
- [x] 2.4 Update `GET /api/campaigns/[id]/entities` (list) to include `imageUrl` in the selection (already included via full select)

## 3. Frontend Component

- [x] 3.1 Create `app/components/EntityImage.vue` — props: `imageUrl`, `name`, `editable`, `campaignId`, `entitySlug`, `size` (sm/md/lg); upload to `/api/campaigns/:id/entities/:slug/image`; placeholder uses lucide `ImageIcon`; loading overlay during upload

## 4. Frontend Pages

- [x] 4.1 Update entity detail page (`app/pages/campaigns/[id]/entities/[slug]/index.vue`) — add `EntityImage` at `lg` size, editable for editor+ role
- [x] 4.2 Update entity list page (`app/pages/campaigns/[id]/entities/index.vue`) — show `sm` thumbnail next to entity name for entities with `imageUrl`
- [x] 4.3 Update entity edit page (`app/pages/campaigns/[id]/entities/[slug]/edit.vue`) — add `EntityImage` in editable mode

## 5. CLI

- [x] 5.1 Add `entity upload-image` subcommand in `cli/src/commands/entity.js` — `--campaign`, `--slug`, `--file` options; sends multipart POST; supports `--json` output
- [x] 5.2 Update `docs/claude-skill.md` with the new `entity upload-image` command
- [x] 5.3 Update `.claude/skills/aleph-cli/SKILL.md` with the new command (bump version to 1.8)

## 6. i18n

- [x] 6.1 Add i18n keys for entity image strings in `i18n/locales/en.json` and `i18n/locales/es.json` (upload label, alt text, no image placeholder, error messages)

## 7. Tests

- [x] 7.1 Unit test: verify `entities` schema includes `imageUrl` column
- [x] 7.2 Integration test: `POST /api/campaigns/:id/entities/:slug/image` — upload valid image, reject invalid MIME, reject oversized, reject insufficient role, reject unauthenticated
- [x] 7.3 Integration test: `GET /api/campaigns/:id/entities/:slug/image` — serve uploaded image, 404 when no image, correct Content-Type and caching headers
- [x] 7.4 Integration test: verify entity detail and list API responses include `imageUrl`
- [x] 7.5 E2E test: entity detail page shows image, edit page allows upload

## 8. Verification

- [x] 8.1 Run `npm run build` — confirm no errors
- [x] 8.2 Run `npx vitest run tests/unit/` — all 540 tests pass
- [x] 8.3 Run `npx vitest run tests/integration/` — all 301 tests pass
- [x] 8.4 Run `npx playwright test` — all E2E tests pass
