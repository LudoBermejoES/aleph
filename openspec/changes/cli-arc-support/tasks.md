## 1. Shared arc/chapter slug resolution helper

- [ ] 1.1 Add `resolveArcSlug(db, campaignId, slug)` to `server/utils/` (new
      `arc-resolution.ts`): returns `null` for `null`/`''`, the arc row for exactly one match,
      throws 404 (`Arc "<slug>" not found`) for none, throws 409 naming the slug and match
      count for more than one
- [ ] 1.2 Add `resolveChapterSlug(db, campaignId, slug, arcId?)` to the same module: joins
      `chapters` to `arcs` and filters on `arcs.campaignId` (never a bare `chapters.slug`
      lookup — see `chapters/[slug]/index.put.ts:18` for the trap being avoided); narrows by
      `arcId` when supplied; same null/404/409 contract
- [ ] 1.3 Unit-test both helpers against an in-memory DB: hit, miss, ambiguous, other-campaign,
      empty string, and `arcId`-narrowed cases

## 2. Sessions PUT accepts arcSlug / chapterSlug

- [ ] 2.1 In `server/api/campaigns/[id]/sessions/[slug]/index.put.ts`, extend
      `sessionPutSchema` with `arcSlug: z.string().nullable().optional()` and
      `chapterSlug: z.string().nullable().optional()` (leave `arcId`/`chapterId` untouched)
- [ ] 2.2 Resolve `chapterSlug` first (when present) via `resolveChapterSlug`, passing the
      resolved arc id when `arcSlug` was also supplied
- [ ] 2.3 When both slugs are supplied and the chapter's `arcId` differs from the resolved
      arc, throw 422 naming both slugs
- [ ] 2.4 When `chapterSlug` resolves and `arcSlug` was absent, set `updates.arcId` from the
      chapter's `arcId`
- [ ] 2.5 `arcSlug` of `null`/`''` sets `updates.arcId = null` **and** `updates.chapterId = null`;
      `chapterSlug` of `null`/`''` sets only `updates.chapterId = null`
- [ ] 2.6 Keep the existing `arcId`/`chapterId` branches (lines 43–44) as-is; slug fields take
      precedence when both forms are sent
- [ ] 2.7 Confirm the `hasMinRole(role, 'co_dm')` check still runs before any slug resolution

## 3. Sessions POST accepts arcSlug / chapterSlug

- [ ] 3.1 In `server/api/campaigns/[id]/sessions/index.post.ts`, extend `sessionSchema` with
      `arcSlug` and `chapterSlug` (optional strings)
- [ ] 3.2 Resolve them with the same helpers and the same 404/409/422 contract, next to the
      existing `groupSlug` resolution (lines 59–70)
- [ ] 3.3 Set the insert's `arcId`/`chapterId` from the resolved rows, deriving `arcId` from
      the chapter when only `chapterSlug` was given

## 4. Sessions GET arc filter and name joins

- [ ] 4.1 In `server/api/campaigns/[id]/sessions/index.get.ts`, read `arcSlug` from the query
      and resolve it to arc ids scoped to the campaign; unknown slug → return the empty
      page exactly as `groupSlug` does (lines 21–22); ambiguous slug → match all such arcs
- [ ] 4.2 Push the arc predicate into the shared `conditions` array so it applies to the
      `COUNT(*)` query as well as the page query
- [ ] 4.3 Left-join `arcs` and `chapters` and add `arcName`/`chapterName` to the projection
      beside `groupName` (line 53)
- [ ] 4.4 Verify `idx_sessions_arc` / `idx_sessions_chapter` are used (no full scan added)

## 5. Server integration tests

- [ ] 5.1 `tests/integration/session-arc-assignment.test.ts`: co_dm PUT `{ arcSlug }` → 200,
      `arcId` set
- [ ] 5.2 PUT `{ chapterSlug }` alone → chapter set and `arcId` derived from the chapter
- [ ] 5.3 PUT consistent `{ arcSlug, chapterSlug }` → 200, both set
- [ ] 5.4 PUT inconsistent pair (chapter from another arc) → 422, row unchanged
- [ ] 5.5 PUT `{ arcSlug: '' }` → both `arcId` and `chapterId` `NULL`
- [ ] 5.6 PUT `{ chapterSlug: '' }` → only `chapterId` cleared
- [ ] 5.7 PUT unknown `arcSlug` → 404, row unchanged
- [ ] 5.8 PUT `arcSlug` belonging to another campaign → 404
- [ ] 5.9 PUT `chapterSlug` whose arc is in another campaign → 404 (guards the campaign-blind
      lookup regression)
- [ ] 5.10 PUT ambiguous `arcSlug` (two arcs, same slug, same campaign) → 409
- [ ] 5.11 PUT ambiguous `chapterSlug` → 409; same call plus `arcSlug` → 200
- [ ] 5.12 PUT `{ arcId }` (existing id form) → unchanged behaviour
- [ ] 5.13 POST session with `arcSlug` → created in that arc
- [ ] 5.14 `player` role PUT `{ arcSlug }` → 403
- [ ] 5.15 Unauthenticated PUT `{ arcSlug }` → 401
- [ ] 5.16 `tests/integration/session-list-arc-filter.test.ts`: `?arcSlug=` returns only that
      arc's sessions and `meta.total` is the filtered count
- [ ] 5.17 Unknown `arcSlug` → 200 with empty data
- [ ] 5.18 `?arcSlug=&groupSlug=&status=` combined → all three predicates applied
- [ ] 5.19 Projection includes `arcName`/`chapterName`, `null` when unassigned
- [ ] 5.20 Unauthenticated list with `arcSlug` → 401

## 6. CLI: session arc/chapter flags

- [ ] 6.1 `cli/src/commands/session.js` `update`: add `--arc <slug>` and `--chapter <slug>`
      with help text noting that an empty string unsets, mapping to `body.arcSlug` /
      `body.chapterSlug` via `!== undefined`
- [ ] 6.2 Extend the "provide at least one field to update" guard and its message to include
      `--arc` and `--chapter`
- [ ] 6.3 `session create`: add the same two flags to the POST body
- [ ] 6.4 `session list`: add `--arc <slug>`, forwarded as the `arcSlug` query param
- [ ] 6.5 `session list` table: add an `arc` column sourced from `arcName`
- [ ] 6.6 `session show`: display `arc` and `chapter` names

## 7. CLI: arc and chapter ordering, listing, and output fixes

- [ ] 7.1 `cli/src/commands/arc.js` `create` and `update`: add `--sort-order <n>`, parsed with
      `Number()` and rejected locally (stderr + non-zero exit) when `NaN`, sent as `sortOrder`
- [ ] 7.2 `arc list`: add a sort-order column (the endpoint already orders by it)
- [ ] 7.3 `arc create`: stop printing `data.slug` (the POST returns only `{ id, name }`) —
      look the arc up by the returned id via `GET /arcs` and print its real slug
- [ ] 7.4 `cli/src/commands/chapter.js` `list`: rebuild over `GET /api/campaigns/:id/arcs`,
      flattening each arc's nested `chapters`; show slug, name, arc name, sort order; add an
      optional `--arc <slug>` narrowing filter — this fixes the current unconditional HTTP 400
- [ ] 7.5 `chapter create`: accept `--arc <arc>` as a slug (resolve via `GET /arcs`) with
      pass-through when the value matches no slug; keep sending `arcId`
- [ ] 7.6 `chapter create` and `update`: add `--sort-order <n>` with the same numeric guard
- [ ] 7.7 `chapter create`: print the real slug, same fix as 7.3

## 8. CLI unit tests

- [ ] 8.1 `tests/unit/cli/session-arc-flags.test.ts`: `--arc`/`--chapter` map to
      `arcSlug`/`chapterSlug`; `--arc ''` produces `arcSlug: ''` (not an omitted field)
- [ ] 8.2 `--arc` alone satisfies the at-least-one-field guard
- [ ] 8.3 `session list --arc` builds the `arcSlug` query param and composes with `--group`
      and pagination
- [ ] 8.4 `tests/unit/cli/arc-sort-order.test.ts`: `--sort-order 3` sends numeric `3`;
      `--sort-order abc` exits non-zero without a request
- [ ] 8.5 `tests/unit/cli/chapter-list.test.ts`: flattening a nested arcs payload yields one
      row per chapter with the arc name, ordered by arc then `sortOrder`; `--arc` narrows it

## 9. Docs and skills

- [ ] 9.1 Update `docs/claude-skill.md`: `session update`/`create`/`list` arc flags, `arc`/
      `chapter` `--sort-order`, `chapter list` without `--arc`, `chapter create --arc <slug>`
- [ ] 9.2 Mirror every line into `.claude/skills/aleph-cli/SKILL.md` and bump `version` in the
      frontmatter (currently `'3.6'`)
- [ ] 9.3 Confirm the two skill files agree line-for-line apart from the invocation prefix

## 10. Final verification

- [ ] 10.1 `npx vitest run tests/unit/` — all pass
- [ ] 10.2 `npx vitest run tests/integration/` (server on port 3333) — all pass
- [ ] 10.3 `npx nuxi typecheck` — zero new errors
- [ ] 10.4 CLI smoke: `node cli/bin/aleph.js session update --help` lists `--arc` and
      `--chapter`; `arc create --help` lists `--sort-order`
- [ ] 10.5 CLI smoke against a real campaign: `chapter list --campaign <id>` returns rows
      instead of HTTP 400, and `arc create` prints a non-`undefined` slug
- [ ] 10.6 End-to-end of the workflow that motivated this change: assign a session with
      `session update <slug> --arc <arc>`, confirm with `session list --arc <arc>`, then
      unset with `--arc ''` — no raw HTTP call anywhere
- [ ] 10.7 No E2E Playwright spec — this change touches no UI
