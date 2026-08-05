## 1. Server

- [x] 1.1 `server/api/campaigns/[id]/arcs/index.get.ts` now imports `autoLinkContent` and applies it to `arc.description` after `stripSecretBlocks`, passing `(strippedDescription, campaignId, null, db)`
- [x] 1.2 Same for each `chapter.description`
- [x] 1.3 Confirmed ordering: `autoLinkContent(stripSecretBlocks(text, role), campaignId, null, db)` — secret-strip runs first, matching `entities/[slug]/index.get.ts`
- [x] 1.4 (Added during implementation, not in the original plan) Split `autoLinkContent` into `buildAutolinkContext` + `applyAutolink` in `server/services/autolink-render.ts` and updated `arcs/index.get.ts` to build the context once per request instead of once per arc/chapter description — see design.md's updated Risks section for the empirical A/B measurement that motivated this (session-arc CLI integration test roughly doubled in duration without it)

## 2. Testing

- [x] 2.1 Extended `tests/unit/server/entity-nicknames-autolink.test.ts` (the actual home of `autoLinkContent` DB-backed tests) with a test confirming a plain entity name links correctly with `currentEntityId = null`
- [x] 2.2 `tests/integration/arc-autolink.test.ts`: arc description with a character's full name, chapter description with that character's nickname — both assert the entity-link directive in the `GET /api/campaigns/{id}/arcs` response
- [x] 2.3 Same file: a secret-only block in an arc description is stripped (and never auto-linked) for a joined player-role request. Found and fixed a bug in my own test while writing it: the join call used `apiRaw` with no CSRF header and failed silently, so the player never actually joined and the assertion would have passed for the wrong reason. Fixed by using `api()` (throws on failure) plus the `X-CSRF-Token` header.
- [x] 2.4 Skipped, as anticipated — pure backend rendering fix to an existing endpoint, no new page/form/navigation; existing arc E2E specs are unaffected

## 3. Verification

- [x] 3.1 `npx vitest run tests/unit/` — 126 files, 1510 tests, all passing (re-ran clean after the 1.4 optimization too)
- [x] 3.2 `npx vitest run tests/integration/` — 101 files, 898 tests: first full run (before the 1.4 optimization) showed 19 failed files / 28 failed tests, most in arc/chapter CLI tests; a controlled A/B (see design.md Risks) confirmed this was a real regression from N+1 automaton rebuilds, not pre-existing flakiness, and led to the 1.4 fix. Second full run (after 1.4): down to 8 failed files / 7 failed tests, none in the same arc-specific tests as before — the one arc-related failure that did appear ("DELETE arc by player returns 403", timeout) re-ran clean in isolation (10/10 passing, 4.6s), and the identical timeout shape appeared in `character-folder-crud.test.ts` (a resource this change never touches), confirming it's pre-existing full-suite-under-load flakiness, not a regression
- [x] 3.3 Verified live via the API (equivalent to the UI, which sources from the same endpoint): created an arc with description "The party met Julia Kirchner in the docks.", `GET /arcs` returned `The party met :entity-link{slug="julia-kirchner" name="Julia Kirchner" type="character"} in the docks.` — confirms the fix end-to-end
