## 1. Database

- [x] 1.1 Add `portraitUrl` (nullable text) column to `characters` table in `server/db/schema/characters.ts`
- [x] 1.2 Generate migration: `npx drizzle-kit generate` and verify the new migration file in `server/db/migrations/`

## 2. Server API — upload & serve

- [x] 2.1 Create `server/api/campaigns/[id]/characters/[slug]/portrait.post.ts` — multipart upload, validate MIME (png/jpeg/webp) and size (≤10 MB), store at `content/<slug>/portrait.<ext>`, update `portraitUrl` on the `characters` row, return `{ portraitUrl }`
- [x] 2.2 Create `server/api/campaigns/[id]/characters/[slug]/portrait.get.ts` — read file from disk, stream with correct Content-Type; return 404 if no portrait
- [x] 2.3 Update `server/api/campaigns/[id]/characters/[slug].get.ts` — include `portraitUrl` in response
- [x] 2.4 Update `server/api/campaigns/[id]/characters/index.get.ts` — include `portraitUrl` in each list item

## 3. Web UI

- [x] 3.1 Create `app/components/CharacterPortrait.vue` — displays portrait image or silhouette placeholder; accepts `portraitUrl`, `name`, `editable` props; when `editable`, shows an upload button that opens a file picker, POSTs to the portrait endpoint, and refreshes
- [x] 3.2 Add portrait to character detail page (`app/pages/campaigns/[id]/characters/[slug].vue`) — use `CharacterPortrait` with `editable` true for editors/DMs
- [x] 3.3 Add portrait thumbnail to character list (wherever character rows are rendered) — use `CharacterPortrait` with `editable` false and small size variant
- [x] 3.4 Add i18n keys to `i18n/locales/en.json` and `i18n/locales/es.json` (`character.uploadPortrait`, `character.portraitAlt`, `character.noPortrait`)

## 4. CLI

- [x] 4.1 Add `postMultipart(path, filePath)` to `cli/src/lib/client.js` using native `FormData` (Node 18+ built-in) — reads file from disk, sends multipart POST with field name `portrait`
- [x] 4.2 Add `upload-portrait` subcommand to `cli/src/commands/character.js` — options: `--campaign <id>`, `--slug <slug>`, `--file <path>`; validates file exists; calls `postMultipart`; prints success with portrait URL
- [x] 4.3 Update `aleph character show` output to display `portraitUrl` if present

## 5. Tests

- [x] 5.1 Integration test: upload portrait, verify 200 + file on disk + `portraitUrl` in DB; then GET portrait returns image bytes
- [x] 5.2 Integration test: upload with invalid MIME returns 400; visitor upload returns 403
- [x] 5.3 Integration test: character show and list responses include `portraitUrl` field
