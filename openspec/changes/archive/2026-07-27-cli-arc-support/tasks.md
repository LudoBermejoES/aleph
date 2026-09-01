> **Audit note (post-implementation).** Ticked against the code and tests as they
> actually landed, not against the plan. Two deviations are recorded inline: the
> resolution helper shipped as one exported function in `server/utils/arc-chapter.ts`
> rather than two in `arc-resolution.ts` (1.1–1.3), and the change did touch the UI
> after all (10.7).

## 1. Shared arc/chapter slug resolution helper

- [x] 1.1 ~~Add `resolveArcSlug(db, campaignId, slug)` to `server/utils/` (new
      `arc-resolution.ts`)~~ **Shipped differently:** the module is
      `server/utils/arc-chapter.ts` and arc resolution is the module-private
      `resolveArcSlug` (`arc-chapter.ts:47`) — `null`/`''` handled by the caller,
      404 `Arc "<slug>" not found` at `:55`, 409 naming slug + match count at `:57`
- [x] 1.2 ~~Add `resolveChapterSlug(...)` to the same module~~ **Shipped as** the
      module-private `findCampaignChapters` (`arc-chapter.ts:71`, joins
      `chapters → arcs` and filters on `arcs.campaignId`) plus the narrowing/404/409/422
      logic in the single exported `resolveArcChapterSlugs` (`:98`). Folding the two
      lookups into one entry point is what makes the arc↔chapter consistency rules
      (422 pair, arc-change cascade) expressible at all — they need both slugs at once.
- [ ] 1.3 ~~Unit-test both helpers against an in-memory DB~~ **Superseded by 1.1/1.2:**
      there are no longer two exported helpers to unit-test — `resolveArcSlug` and
      `findCampaignChapters` are module-private, and the one public entry point takes a
      live `BetterSQLite3Database`. Every case this task listed (hit, miss, ambiguous,
      other-campaign, empty string, `arcId`-narrowed) is instead covered end-to-end over
      HTTP in `tests/integration/session-arc-slug.test.ts` — see 5.1–5.15. Left
      unchecked deliberately: the helper has no direct unit test, so a future caller of
      `resolveArcChapterSlugs` outside the sessions endpoints would be untested.
      **Triaje 2026-09-01: se confirma como deuda DECLARADA, no olvidada.** Verificado contra el
      árbol: `resolveArcSlug` y `findCampaignChapters` siguen sin `export`
      (`server/utils/arc-chapter.ts`), y `resolveArcChapterSlugs` no aparece fuera de
      `server/api/campaigns/[id]/sessions/`. Mientras eso siga así, la cobertura por HTTP de
      `tests/integration/session-arc-slug.test.ts` es suficiente; el día que aparezca un segundo
      llamante, el test unitario pasa a ser obligatorio. La casilla se deja SIN marcar a
      propósito: marcarla afirmaría un test que no existe.

## 2. Sessions PUT accepts arcSlug / chapterSlug

- [x] 2.1 `sessionPutSchema` extended with `arcSlug`/`chapterSlug`, `arcId`/`chapterId`
      untouched — `sessions/[slug]/index.put.ts:26-27` (ids still at `:24-25`)
- [x] 2.2 Resolution delegated to `resolveArcChapterSlugs` — `index.put.ts:56`; the
      resolved arc narrows the chapter inside the helper (`arc-chapter.ts:147`)
- [x] 2.3 422 when the pair disagrees, naming both slugs — `arc-chapter.ts:148-153`
- [x] 2.4 `chapterSlug` alone derives `arcId` from the chapter — `arc-chapter.ts:165`
- [x] 2.5 `arcSlug` `null`/`''` clears both; `chapterSlug` `null`/`''` clears only the
      chapter — `arc-chapter.ts:112-120` and `:138`
- [x] 2.6 The `arcId`/`chapterId` branches kept (`index.put.ts:46-47`) and the slug
      results applied after them (`:62-63`), so an explicit slug wins
- [x] 2.7 `hasMinRole(role, 'co_dm')` runs before the body is even parsed —
      `index.put.ts:13`, ahead of `validateBody` at `:31`

**Beyond the original plan** (spec amended mid-implementation, both implemented):

- [x] 2.8 A non-empty `arcSlug` with no `chapterSlug` clears a `chapterId` stranded
      under the old arc — `arc-chapter.ts:127-137`; the comparison uses the chapter the
      request will actually leave behind (`index.put.ts:54-55`), not just the stored one
- [x] 2.9 `arcSlug: ''` together with a non-empty `chapterSlug` → 422 —
      `arc-chapter.ts:113-118`

## 3. Sessions POST accepts arcSlug / chapterSlug

- [x] 3.1 `sessionSchema` extended — `sessions/index.post.ts:28-29`
- [x] 3.2 Same helper, same 404/409/422 contract, resolved _before_ the log file is
      written so a bad slug leaves no orphan `.md` — `index.post.ts:38-41`
- [x] 3.3 Insert takes the resolved values with the id form as fallback —
      `index.post.ts:92-93`; `arcId` derived from the chapter by the helper. No `current`
      state passed, correctly — there is nothing to cascade from on create.

## 4. Sessions GET arc filter and name joins

- [x] 4.1 `arcSlug` read and resolved to ids scoped to the campaign; unknown slug returns
      the empty page exactly as `groupSlug` does — `sessions/index.get.ts:30-41`.
      Ambiguous slug matches every arc carrying it (`inArray`), the documented
      read-path choice
- [x] 4.2 Predicate pushed into the shared `conditions` array — `index.get.ts:46` — so it
      applies to the `COUNT(*)` at `:51-55` as well as the page query
- [x] 4.3 `arcs`/`chapters` left-joined and `arcName`/`chapterName` added beside
      `groupName` — `index.get.ts:69,71,79-80`
- [x] 4.4 `idx_sessions_arc` / `idx_sessions_chapter` exist
      (`server/db/schema/sessions.ts:74-75`) and the filter is an indexed
      `arcId IN (…)`, so no scan was added

**Beyond the original plan:**

- [x] 4.5 The single-session GET reports `arcName`, `arcSlug`, and `chapterName` so it
      agrees with the list projection — `sessions/[slug]/index.get.ts:41-62,104-106`

## 5. Server integration tests

All in `tests/integration/session-arc-slug.test.ts` (35 cases, all passing).

- [x] 5.1 `assigns an arc by slug` (`:122`)
- [x] 5.2 `assigning a chapter derives the arc` (`:130`)
- [x] 5.3 `applies a consistent arc + chapter pair` (`:141`)
- [x] 5.4 `rejects a chapter from a different arc with 422 naming both slugs` (`:153`)
- [x] 5.5 `clearing the arc also clears the chapter` (`:167`); `null` variant at `:240`
- [x] 5.6 `clearing the chapter leaves the arc intact` (`:179`)
- [x] 5.7 `unknown arc slug returns 404 quoting the slug, session unmodified` (`:263`)
- [x] 5.8 `arc slug from another campaign does not resolve` (`:278`)
- [x] 5.9 `chapter slug that exists only in another campaign does not resolve` (`:286`),
      plus `a same-slug chapter in another campaign does not shadow this campaign` (`:296`)
- [x] 5.10 `ambiguous arc slug returns 409 naming slug and match count` (`:307`)
- [x] 5.11 `ambiguous chapter slug is 409 alone and resolvable with arcSlug` (`:322`)
- [x] 5.12 `id-based assignment keeps working unchanged` (`:348`)
- [x] 5.13 `session creation accepts arcSlug` (`:360`), `…accepts chapterSlug and derives
the arc` (`:368`), `…with an unknown arcSlug returns 404` (`:376`)
- [x] 5.14 `player role cannot assign an arc (403)` (`:382`)
- [x] 5.15 `unauthenticated request cannot assign an arc (401)` (`:405`)
- [x] 5.16 `filters sessions by arc slug` (`:489`) and `filtered total reflects the
filter, not the campaign total` (`:496`)
- [x] 5.17 `unknown arc slug yields an empty page, not 404` (`:507`)
- [x] 5.18 `arc filter composes with the group and status filters` (`:514`)
- [x] 5.19 `response carries arc and chapter names` (`:521`), `unassigned sessions report
null names` (`:529`)
- [x] 5.20 `unauthenticated arc-filtered list is rejected` (`:588`)

Added beyond the plan, covering the amended spec:

- [x] 5.21 `moving a session to another arc clears a now-inconsistent chapter` (`:191`),
      the no-op counterpart `re-stating the arc the chapter already belongs to leaves the
chapter alone` (`:203`), and `the cascade sees a chapterId sent in the same
request, not just the stored one` (`:215`)
- [x] 5.22 `clearing the arc while naming a chapter is rejected with 422` (`:252`)
- [x] 5.23 `arc POST returns the slug (was undefined before this change)` (`:113`),
      `chapter POST returns the slug` (`:118`)
- [x] 5.24 `single-session GET reports arc and chapter names too` (`:561`, asserts
      `arcSlug`), `…reports null names when unassigned` (`:576`); and
      `ambiguous arc slug on the read path matches every arc sharing it` (`:538`)

Known untested branches (no spec scenario demands them, recorded so they are not
mistaken for covered): the 422 inconsistent-pair and 409 ambiguous paths on **POST**
(only the PUT path is exercised, through the same helper), and the
"ambiguous within a single arc" 409 message at `arc-chapter.ts:160`.

## 6. CLI: session arc/chapter flags

- [x] 6.1 `--arc`/`--chapter` on `session update` with unset-on-empty help text
      (`cli/src/commands/session.js:112-116`), mapped via `!== undefined` (`:125-126`)
- [x] 6.2 Guard and message extended (`session.js:129`)
- [x] 6.3 `session create` sends `arcSlug`/`chapterSlug` (`session.js:58-59,66-67`)
- [x] 6.4 `session list --arc` → `arcSlug` query param (`session.js:17,24`)
- [x] 6.5 Arc column from `arcName`, never a UUID (`session.js:43-44`)
- [x] 6.6 `session show` prints arc and chapter names, preferring the server projection
      and falling back to an arcs lookup (`session.js:87,94-95,458-481`)

## 7. CLI: arc and chapter ordering, listing, and output fixes

- [x] 7.1 `--sort-order` on `arc create`/`update`, parsed by `sortOrderOrExit`, which
      writes to stderr and exits non-zero without sending a request
      (`cli/src/commands/arc.js:37,43,61,67`; `cli/src/lib/arcs.js:16-39`)
- [x] 7.2 `arc list` shows `sortOrder` (`arc.js:24`)
- [x] 7.3 `arc create` prints a real slug — and rather than only fixing the client, the
      arcs POST now returns `slug` (`arcs/index.post.ts`), with the id lookup kept as a
      fallback (`arc.js:48,100-105`)
- [x] 7.4 `chapter list` rebuilt over `GET /arcs` + `flattenChapters`, with optional
      `--arc` narrowing (`chapter.js:10-33`; `lib/arcs.js:62-82`) — the HTTP 400 is gone
- [x] 7.5 `chapter create --arc` resolves a slug, passes an id through, and errors before
      the POST on no match (`chapter.js:46,104-112`; `findArcRef` at `lib/arcs.js:48`,
      slug preferred over id)
- [x] 7.6 `--sort-order` on `chapter create`/`update` with the same guard
      (`chapter.js:42,48,65,70`)
- [x] 7.7 `chapter create` prints a real slug; chapters POST also returns `slug` now
      (`chapter.js:53,118-123`)

## 8. CLI unit tests

- [x] 8.1 `tests/unit/cli/session-arc-flags.test.ts` — `maps --arc/--chapter to
arcSlug/chapterSlug…` (`:20`), `uses !== undefined so --arc '' sends an empty
string rather than omitting the field` (`:25`)
- [x] 8.2 `counts --arc and --chapter in the at-least-one-field guard message` (`:30`),
      executed for real in `tests/integration/cli/session-arc.test.ts:206`
- [x] 8.3 `forwards --arc as the arcSlug query param` (`:50`), `still forwards groupSlug
and pagination alongside it` (`:54`)
- [x] 8.4 `tests/unit/cli/arc-sort-order.test.ts` — 7 `parseSortOrder` cases (`:14-40`)
      and `writes to stderr and exits non-zero for an invalid value` (`:54`)
- [x] 8.5 `tests/unit/cli/chapter-list.test.ts` — flattening, arc-then-sortOrder
      ordering, arc name, `--arc` narrowing by slug and by id (`:32-93`)

- [x] 8.6 **Added beyond the plan:** `tests/integration/cli/session-arc.test.ts` drives
      the real `cli/bin/aleph.js` against a live server for all 23 behaviours (arc/chapter
      create + sort order, `chapter list` campaign-wide, session assign/unset/derive,
      error paths, auth). This is what actually covers the CLI behaviourally — the unit
      tests above are `readFileSync` + `toContain` source assertions, so they guard the
      wiring, not the outcome.

## 9. Docs and skills

- [x] 9.1 `docs/claude-skill.md:116-121,363-364,371-373` — session arc flags, `--sort-order`,
      `chapter list` without `--arc`, `chapter create --arc <slug>`. `docs/cli.md` updated too
- [x] 9.2 `.claude/skills/aleph-cli/SKILL.md:112-117,353-354,361-363`; frontmatter
      `version` bumped `'3.6'` → `'3.7'`
- [x] 9.3 The two files agree line-for-line apart from the `node …/aleph.js` prefix

## 10. Final verification

- [x] 10.1 `npx vitest run tests/unit/` — passing (106 tests over the 9 CLI/component files
      relevant here)
- [x] 10.2 `npx vitest run tests/integration/session-arc-slug.test.ts
tests/integration/cli/session-arc.test.ts` against a dev server on 3333 —
      58 passed, 0 failed
- [x] 10.3 `npx nuxi typecheck` — exit 0, no errors
- [x] 10.4 `session update --help` lists `--arc` and `--chapter`; `arc create --help`
      lists `--sort-order` — verified by running both
- [x] 10.5 Covered as automation instead of a manual smoke: `chapter list works
campaign-wide (no arc_id 400) and shows the arc name`
      (`tests/integration/cli/session-arc.test.ts:163`) and `arc create prints the real
slug, not (undefined)` (`:89`) create a real campaign and drive the real CLI
- [x] 10.6 Same suite walks the motivating workflow end to end: assign (`:190`), confirm
      via the arc filter (`:225`), unset with `--arc ''` (`:251`) — no raw HTTP anywhere
- [ ] 10.7 ~~No E2E Playwright spec — this change touches no UI~~ **Superseded — the
      premise was wrong.** The change did reach the UI: `971cc2c` fixed the arc detail
      page, which listed none of its sessions because it filtered a single paginated page
      client-side, and `ac5679b` added an arc badge to the session page. Both are covered
      (`tests/e2e/arc-detail-sessions.spec.ts`,
      `tests/unit/components/arc-detail-sessions.test.ts`). Left unchecked because the
      task as written asserts something untrue, and because the proposal's "Frontend
      (`app/`): none" and "`arcs-chapters-ui`: no delta" are now inaccurate: the session
      page's arc badge is UI behaviour that no requirement describes.
      **Triaje 2026-09-01: se confirma OBSOLETA en su enunciado y ya resuelta en el fondo.** Los
      dos ficheros que cita existen (`tests/e2e/arc-detail-sessions.spec.ts`,
      `tests/unit/components/arc-detail-sessions.test.ts`), así que la cobertura prometida está.
      Lo único que queda vivo es lo documental: el `proposal.md` de este cambio sigue diciendo
      «Frontend (`app/`): none». La casilla se deja SIN marcar porque marcarla afirmaría la frase
      que la propia tarea declara falsa.
