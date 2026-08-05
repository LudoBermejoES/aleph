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

- [x] 8.1 Committed (`46f2351`) and pushed to `master`; GitHub Actions "Deploy Aleph" workflow ran and succeeded (3m35s)
- [x] 8.2 Confirmed live: `entity show 26-de-julio-de-2025` (a session created before this change) now resolves with `type: session`; `entity show el-camino-hasta-oda` (a pre-existing arc) resolves with `type: arc` — the boot-time backfills ran successfully in production

## 9. Populate relations from existing content (Berlín en Tinieblas only — see design.md Non-Goals)

- [x] 9.1 Checked all 88 sessions (not just the 2 recently imported — every session in this campaign already has a real `summary` content record, contrary to the original assumption that only recent ones would)
- [x] 9.2–9.3 Used the server's own auto-link detection (`GET /sessions/:slug/render` and the already-auto-linked `arc.description` from `GET /arcs`) as the mention-extraction mechanism instead of manual per-session reading — every `:entity-link{slug=...}` in a session's summary/notes or an arc's description is, by construction, a text match the system itself considers a reference. This is mechanical, not manual judgment, so a dry run was run first and spot-checked before creating anything live (see below). One session (`los-que-murieron-antes`) had no mentions found — its content exists but doesn't auto-link to anything, left alone rather than forced. Relations use per-type label pairs (character: "contó con"/"participó en"; location: "tuvo lugar en"/"fue escenario de"; organization: "involucró a"/"participó en"; quest: "avanzó"/"avanzada en"; arc: "pertenece a"/"incluye la sesión") applied uniformly, not a single generic "related to."
- [x] 9.4 Same pass covered all 12 arcs in the same run (arc descriptions already come back auto-linked from `GET /arcs`, per the `arc-autolink` change)
- [x] 9.5 **Dry run found 4 real false positives before anything was created**, discovered by spot-checking a sample rather than trusting the mechanical extraction blindly: "Vacíos" (a character) collided with the common adjective "vacíos" (empty) in 3 places; "Feng Chao"'s nickname "Chao" collided with the farewell interjection "chao"/"ciao" once. A broader check then found every single `type: "session"` match (7/7 sampled) was _also_ a false positive — session titles in this campaign are often narrative phrases, creature names, or character epithets ("Querubines", "Continuidad", "La Príncipe de Berlín") that recur in ordinary prose unrelated to referencing that specific past session. "Berlín" (the top-level location) was excluded too — true of nearly every session, so it would add graph noise rather than signal (design.md's "worth creating" bar). Excluding these four slugs plus all `session`-type targets brought the candidate count from 469 down to 450; a fresh random sample of 25 of the 450 was reviewed and all were genuine. **Final result: 450 relations created live, 0 errors, 0 skipped as already-existing.** Verified via `relation list` on a known session (6 correct character relations, matching the filtered set exactly).
