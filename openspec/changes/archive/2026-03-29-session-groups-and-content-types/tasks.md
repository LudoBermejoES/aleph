## 1. Database Schema

- [x] 1.1 Add `sessionGroups` table to `server/db/schema/sessions.ts` — fields: `id`, `campaignId`, `name`, `slug`, `description`, `imageUrl`, `sortOrder`, `createdAt`, `updatedAt`
- [x] 1.2 Add `sessionContents` table to `server/db/schema/sessions.ts` — fields: `id`, `sessionId`, `type` (`manual_notes` | `ai_notes` | `summary`), `content`, `createdAt`, `updatedAt`; UNIQUE on `(sessionId, type)`
- [x] 1.3 Add nullable `groupId` column to `gameSessions` referencing `sessionGroups.id` with `ON DELETE SET NULL`
- [x] 1.4 Write migration SQL in `server/db/migrations/` — create `session_groups`, create `session_contents`, alter `game_sessions` to add `group_id`; apply migration via sqlite3 and insert hash into `__drizzle_migrations`

## 2. Session Groups API

- [x] 2.1 Create `server/api/campaigns/[id]/session-groups/index.get.ts` — return all groups for campaign ordered by `sortOrder`
- [x] 2.2 Create `server/api/campaigns/[id]/session-groups/index.post.ts` — create group (editor+); auto-generate slug from name; return created group
- [x] 2.3 Create `server/api/campaigns/[id]/session-groups/[slug]/index.put.ts` — update name/description/sortOrder (editor+); preserve slug
- [x] 2.4 Create `server/api/campaigns/[id]/session-groups/[slug]/index.delete.ts` — delete group (dm/co_dm); sessions' `groupId` becomes NULL via DB cascade
- [x] 2.5 Create `server/api/campaigns/[id]/session-groups/[slug]/image.post.ts` — multipart upload (PNG/JPEG/WebP, max 10MB); store at `content/campaigns/{slug}/session-groups/{groupSlug}/image.{ext}`; update `imageUrl` on the group record (editor+)
- [x] 2.6 Create `server/api/campaigns/[id]/session-groups/[slug]/image.get.ts` — serve image from disk with `Cache-Control: public, max-age=3600`

## 3. Session Content API

- [x] 3.1 Create `server/api/campaigns/[id]/sessions/[slug]/content/index.get.ts` — return `{ manual_notes, ai_notes, summary }` object (null for missing types)
- [x] 3.2 Create `server/api/campaigns/[id]/sessions/[slug]/content/index.put.ts` — body `{ type, content }`; upsert `sessionContents` record; editor+ only

## 4. Session API Updates

- [x] 4.1 Update `server/api/campaigns/[id]/sessions/index.get.ts` — support `?groupSlug=` query param (filter by group slug); include `groupId` and `groupName` in response items
- [x] 4.2 Update `server/api/campaigns/[id]/sessions/index.post.ts` — accept optional `groupSlug` in body; resolve to `groupId` before insert
- [x] 4.3 Update `server/api/campaigns/[id]/sessions/[slug]/index.get.ts` — include `groupId`, `groupName`, and `hasContent: { manual_notes, ai_notes, summary }` in response
- [x] 4.4 Update `server/api/campaigns/[id]/sessions/[slug]/index.put.ts` — accept optional `groupSlug`; resolve and update `groupId`

## 5. Frontend — Session List

- [x] 5.1 Update `app/pages/campaigns/[id]/sessions/index.vue` — fetch groups; add group tab bar above session list (with group image thumbnail and name per tab); pass `?groupSlug=` filter to session list fetch; show group name badge on each session item

## 6. Frontend — Session Group Management

- [x] 6.1 Create `app/pages/campaigns/[id]/session-groups/index.vue` — list groups with image, name, description; create/edit/delete actions (editor+); image upload by clicking the group image

## 7. Frontend — Session Detail

- [x] 7.1 Update `app/pages/campaigns/[id]/sessions/[slug]/index.vue` — add three content tabs (Manual Notes / AI Notes / Summary); fetch content from `GET /sessions/:slug/content`; render each tab as markdown (view mode) or editor (edit mode); save via `PUT /sessions/:slug/content`

## 8. Frontend — Session Create/Edit

- [x] 8.1 Update `app/pages/campaigns/[id]/sessions/new.vue` — add group selector dropdown (fetched from `/session-groups`); pass selected group slug to create API
- [x] 8.2 Update `app/pages/campaigns/[id]/sessions/[slug]/edit.vue` — add group selector pre-populated with current group; update session on save

## 9. i18n

- [x] 9.1 Add keys to `i18n/locales/en.json` and `es.json`: `sessions.groups`, `sessions.allGroups`, `sessions.noGroup`, `sessions.group`, `sessions.content.manualNotes`, `sessions.content.aiNotes`, `sessions.content.summary`, `sessions.content.empty`, `sessionGroups.title`, `sessionGroups.new`, `sessionGroups.edit`, `sessionGroups.delete`, `sessionGroups.uploadImage`

## 10. CLI

- [x] 10.1 Create `cli/src/commands/session-group.js` — subcommands: `list`, `create`, `delete`; uses `X-API-Key` auth
- [x] 10.2 Update `cli/src/commands/session.js` `create` subcommand — add `--group <slug>` option
- [x] 10.3 Update `cli/src/commands/session.js` `show` subcommand — display group name and content availability in output
- [x] 10.4 Register `session-group` command in `cli/bin/aleph.js`
- [x] 10.5 Update `docs/claude-skill.md` and `.claude/skills/aleph-cli/SKILL.md` — document new `session-group` commands and updated `session` options

## 11. Tests

- [x] 11.1 Unit test: `session-groups` slug generation and uniqueness logic
- [x] 11.2 Integration test: CRUD for session groups including image upload; filter sessions by group; content upsert and retrieval
- [x] 11.3 E2E test: create a session group, create a session in that group, verify it appears under that group tab

## 12. Verification

- [x] 12.1 Run `npm run build` — no errors
- [x] 12.2 Run `npx vitest run tests/unit/` — all pass
- [x] 12.3 Run `npx vitest run tests/integration/` — all pass
