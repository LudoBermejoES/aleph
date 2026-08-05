## 1. Data model

- [x] 1.1 Added `{ slug: 'arc', name: 'Arc', icon: 'book', sortOrder: 10 }` to `BUILTIN_TYPES` in `server/services/entity-types.ts`

## 2. Server API — sessions

- [x] 2.1 `server/api/campaigns/[id]/sessions/index.post.ts` now uses `ensureUniqueSlug` and inserts an `entities` row (`type: 'session'`, `id` = session's own id, `filePath` = the session's `logFilePath`) alongside the `game_sessions` insert
- [x] 2.2 `server/api/campaigns/[id]/sessions/[slug]/index.put.ts` now syncs the mirror entity's `name` when `title` changes
- [x] 2.3 `server/api/campaigns/[id]/sessions/[slug]/index.delete.ts` now also deletes the mirror `entities` row
- [x] 2.4 Confirmed: `session import` calls the same `POST /sessions` endpoint (`cli/src/commands/session.js:397`) already verified live in 5.1 — no separate check needed

## 3. Server API — arcs

- [x] 3.1 `server/api/campaigns/[id]/arcs/index.post.ts` now uses `ensureUniqueSlug` and inserts an `entities` row (`type: 'arc'`, `id` = arc's own id, `filePath: ''`, `createdAt`/`updatedAt` = `new Date()`)
- [x] 3.2 `server/api/campaigns/[id]/arcs/[slug]/index.put.ts` now syncs the mirror entity's `name` when `name` changes
- [x] 3.3 `server/api/campaigns/[id]/arcs/[slug]/index.delete.ts` now also deletes the mirror `entities` row

## 4. Backfill

- [x] 4.1 Wrote `server/db/backfills/session-entities.ts`
- [x] 4.2 Wrote `server/db/backfills/arc-entities.ts`
- [x] 4.3 Wired both into `server/plugins/migrations.ts`
- [x] 4.4 Restarted the local dev server twice: all pre-existing sessions (5910, accumulated across every integration test run) and arcs (482) got mirror entities with correct `type`/`name` on the boot after the code landed (likely applied during an earlier Nitro dev hot-reload, since counts already matched by the first controlled restart); the second restart confirmed idempotency (counts unchanged, no errors, no duplicates)

## 5. CLI verification (per project CLAUDE.md)

- [x] 5.1 Verified live: created a session, an arc, and a character in a throwaway campaign; `relation create` for session-to-character, session-to-arc, and arc-to-character all succeeded; `relation list` showed correct `sourceType`/`targetType` (`session`/`arc`); renaming both synced the mirror entity name; deleting the session cascaded only its own relation (arc-to-character survived); deleting the arc cascaded the rest — zero changes needed to `relation.js`/`client.js`
- [x] 5.2 Updated both skill docs with a sessions/arcs relation example; bumped SKILL.md `version: '3.14'` → `'3.15'`

## 6. Testing

- [x] 6.1 `tests/unit/db/session-entities-backfill.test.ts` (3 tests) + `tests/unit/db/arc-entities-backfill.test.ts` (3 tests) — mirror creation, slug de-duplication, idempotency
- [x] 6.2 `tests/integration/session-arc-relations.test.ts` (12 tests): session/arc creation registers a mirror entity; slug de-duplication; session-to-character, session-to-arc, arc-to-location relations; 403 for a player; 400 for cross-campaign; rename syncs both mirror entities; delete cascades relations for both, verified not to touch an unrelated relation on the same target
- [x] 6.3 Skipped, as planned — CLI/API-level change, no new UI surface

## 7. Verification

- [x] 7.1 `npx vitest run tests/unit/` — 128 files, 1523 tests, all passing (after fixing one pre-existing test's hardcoded `toHaveLength(9)` built-in-entity-type count to 10, since this change adds the `arc` type)
- [x] 7.2 First full run surfaced 2 real, non-flaky failures in `tests/integration/session-arc-slug.test.ts` — not pre-existing flakiness (investigated per the `arc-autolink` precedent, not assumed away): giving arcs a unique slug broke two tests that depended on being able to create two arcs sharing a slug. Fixed by updating both tests to assert the new behavior instead (documented as a discovered risk in design.md); re-ran clean
- [x] 7.3 `eslint`/`prettier --check` clean on all changed files; `npx nuxi typecheck` shows only pre-existing errors in frontend `.vue` files this change never touches — nothing new in the session/arc/entity-types/backfill files
- [x] 7.4 Verified live in 5.1 — created a session, an arc, a character, and a location in a throwaway campaign; `relation create` succeeded for every combination (session↔character, session↔arc, arc↔character, arc↔location)

## 8. Deploy

- [ ] 8.1 Commit and push to `master` (triggers the existing GitHub Actions deploy workflow to `aleph.ludobermejo.es`)
- [ ] 8.2 Confirm the deploy succeeded and the boot-time backfills ran against the live server — e.g. `aleph entity show <slug>` for a session/arc that existed before this change should now resolve instead of 404ing

## 9. Populate relations from existing content (Berlín en Tinieblas only — see design.md Non-Goals)

- [ ] 9.1 List all sessions in the campaign (`aleph session list --campaign <id> --json`) and identify which have actual content to read: a `summary`, `manual_notes`, or `ai_notes` record via `session content get`, or (for the two most recently imported) the local `sesiones/berlin_en_tinieblas/summary/*.md` files already in the repo
- [ ] 9.2 For each session with real content: read it, identify the characters/locations/organizations/quests it depicts as actually present or central (not incidental namedrops — same bar already used for character/NPC creation earlier in this project), and check existing relations for that session first (`relation list --entity <slug>`) to avoid duplicates
- [ ] 9.3 Create the missing relations with a short, specific forward/reverse label pair per relation (e.g. "tuvo lugar en" / "fue escenario de" for a location; "participó en" / "contó con" for a character) — not a single generic "related to" for everything
- [ ] 9.4 Repeat 9.1–9.3 for each of the 12 arcs, using `sesiones/berlin_en_tinieblas/arcs/*.md` as the source text (all 12 already have substantial descriptions in the repo)
- [ ] 9.5 Report a summary: how many sessions/arcs had content worth processing, how many were skipped for lack of content, and how many relations were created in total
