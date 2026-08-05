## 1. Data model

- [x] 1.1 Superseded by implementation: no new column needed. Decision revised to reuse `quests.id` as `entities.id` (the organization pattern), per updated design.md Decision 1. `createdBy` resolved by using the owning campaign's `createdBy` as fallback for backfilled rows — no `quests.createdBy` column added.
- [x] 1.2 Superseded: no schema change to `server/db/schema/sessions.ts` — no new column.
- [x] 1.3 Superseded: no migration to generate.
- [x] 1.4 Write `server/db/backfills/quest-entities.ts` (boot-time backfill, not a SQL migration, per updated design.md Decision 4): for every `quests` row with no matching `entities.id`, compute a collision-safe slug (reusing `ensureUniqueSlug`'s logic), insert an `entities` row (`id` = quest's own id, `type: 'quest'`, `filePath` from `quests.logFilePath`, `visibility` from `isSecret`, `createdAt`/`updatedAt` copied from the quest, `createdBy` = the campaign's `createdBy`)
- [x] 1.5 Superseded: no NOT NULL migration needed (no new column).
- [x] 1.6 Ran the backfill against the local dev DB copy (231 pre-existing quests, not the user's production data — that runs the same boot-time backfill on next production deploy/restart): all 231 got mirror `entities` rows (`migrated: 231, skippedExisting: 0`); restarted the server and confirmed idempotency (`migrated: 0`, still 231/231, no duplicates)

## 2. Server API

- [x] 2.1 Update `server/api/campaigns/[id]/quests/index.post.ts` to use `ensureUniqueSlug` (campaign-wide, against `entities`) instead of bare `slugify()` — one shared slug for both rows (design.md Decision 3)
- [x] 2.2 Update the same endpoint to insert an `entities` row (`type: 'quest'`, `id` = quest's own id) mirroring `server/api/campaigns/[id]/characters/index.post.ts`'s entity-insert flow (no new FK column — design.md Decision 1)
- [x] 2.3 Verified live against a local test campaign: `GET /entities/:slug` resolves a quest with `type: "quest"`; `GET /entities?type=quest` lists both created quests. Code inspection of both endpoints confirms no type-specific filtering exists — RBAC/visibility applies generically via `canUserAccessEntity`/`buildVisibilityFilter`
- [x] 2.4 Verified live: `aleph relation create/list` succeeded for quest-to-quest and quest-to-character pairs with zero CLI/API code changes, exactly reproducing the user's original failing command. Code inspection of `POST /relations` confirms no type-specific assumptions exist (generic `entities.id` lookup)
- [x] 2.5 Quest update/delete endpoints updated: `PUT` now syncs `entities.name`/`entities.visibility` on rename/secrecy change; `DELETE` now also deletes the mirror `entities` row so `entity_relations` cascade-delete

## 3. CLI (aleph-cli) — required per project CLAUDE.md

- [x] 3.1 Verified live (see 2.4) — `relation create/list` work for quest slugs with zero changes to `relation.js`/`client.js`
- [x] 3.2 Reviewed `quest.js`: no change needed. `quest create --json` already returns `{ id, slug, name, status }`, and since `quests.id === entities.id` now, that `id` already _is_ the mirror entity's id — nothing new to expose. `relation create` resolves by slug anyway, not by id, so this was never blocking
- [x] 3.3 Updated `docs/claude-skill.md`'s Relations section with a quest example, mirroring the existing organizations note
- [x] 3.4 Updated `.claude/skills/aleph-cli/SKILL.md` identically and bumped `version: '3.13'` → `'3.14'`

## 4. Frontend (minimal, per design.md non-goals)

- [x] 4.1 Confirmed by code inspection: `GET /quests/:slug` (`server/api/campaigns/[id]/quests/[slug]/index.get.ts`) spreads the `quests` row unchanged — `entityId` (linked entity) and `parentQuestId` are untouched DB columns this change never modifies. No code change needed.
- [x] 4.2 Noted here as the deferred follow-up (per design.md Non-Goals): whether `app/pages/campaigns/[id]/graph.vue` / `EntityGraphView.client.vue` should render quest nodes now that quests are real entities. Not required for this change; a future change should pick this up if wanted.

## 5. Testing

- [x] 5.1 Folded into the integration suite (5.3) — quest creation's slug uniqueness is server-route behavior, not a pure function worth unit-testing in isolation; `tests/integration/quest-relations.test.ts` covers both the non-colliding and colliding cases
- [x] 5.2 `tests/unit/db/quest-entities-backfill.test.ts` — mirror creation, name/slug/createdBy, `isSecret` → visibility mapping, slug de-duplication (quest's own slug untouched), idempotency, already-mirrored quests skipped. **Found and fixed a real bug while writing these**: the initial backfill query filtered already-mirrored quests out via SQL (`WHERE entities.id IS NULL`), so the in-loop "already mirrored" check could never fire on a second boot — `skippedExisting` silently stayed 0 forever instead of reporting the true count. Fixed by querying all quests and checking existence per-row in the loop instead.
- [x] 5.3 `tests/integration/quest-relations.test.ts` (8 tests, all passing against the local dev server): mirror entity created on quest creation; slug de-duplication against a colliding location; quest-to-quest and quest-to-character relations; 403 for a player; 400 for cross-campaign; rename syncs the mirror entity's name; delete removes the mirror entity and cascades its relations
- [x] 5.4 Covered at the unit level in 5.2 (mirror entity resolvable + usable as a relation endpoint after backfill) rather than a separate integration test, since the integration server's DB already has all quests mirrored at boot — there is no "pre-backfill" state to integration-test against without restarting the shared dev server mid-suite
- [x] 5.5 Skipped, as anticipated — this is a CLI/API-level change with no new UI surface; existing quest E2E specs (`tests/e2e/quests.spec.ts`, `quest-detail.spec.ts`) were not touched and continue to cover the UI

## 6. Verification

- [x] 6.1 `npx vitest run tests/unit/` — 126 files, 1509 tests, all passing
- [x] 6.2 `npx vitest run tests/integration/` — 100 files, 895 tests: 892 passing, 3 failures (rate-limiting timeout, a CLI location-image MIME-type test, a CLI session-arc timeout) in files this change never touches; all 3 re-ran clean in isolation (44/44), confirming pre-existing load/timing flakiness from running the whole suite against a shared dev DB with ~6000 test campaigns, not a regression from this change
- [x] 6.3 `eslint`/`prettier --check` clean on all changed files; `npx nuxi typecheck` shows only pre-existing errors in files this change never touches (hocuspocus, tldraw, campaign-import, genealogy, the characters detail page's loosely-typed API responses) — nothing new in the quest/entity/backfill files
- [x] 6.4 Reproduced live against a local test campaign: created a main quest + sub-quest, ran the user's exact original command (`aleph relation create --source encontrar-al-herrero --target impedir-la-corrupcion-de-tezgul --forward "es parte de" --reverse "incluye la sub-misión"`) — succeeded, returning a relation id instead of "Error: Entity not found"
