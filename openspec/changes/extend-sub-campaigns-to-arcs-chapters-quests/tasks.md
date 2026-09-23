# Tasks

Order matters in §1: the audit has to run against production **before** the 422 ships, or the
refusal fires on pre-existing data and a Narrator meets it as an error message instead of a warning.
Everything from §3 onwards is independent and can land in any order.

## 1. Audit and repair first (read-only, ships alone)

- [x] 1.1 Add `GET /api/campaigns/:id/sub-campaigns/audit` reporting every session whose arc's `subCampaignId` differs from its own, projecting session slug, both sub-campaign names, and the arc. Read-only: assert in the test that no row changed.
- [x] 1.2 Add `aleph sub-campaign audit --campaign <id>`, non-zero exit when it finds anything, with `--fix` applying the repair.
- [x] 1.3 **Run it against production.** Measured 2026-09-23 across all four campaigns, computing the audit's own query from the existing `/arcs` and `/sessions` endpoints so it could run _before_ the endpoint was deployed:

  | Campaign            | Arcs | Sessions | With an arc | Incoherent |
  | ------------------- | ---- | -------- | ----------- | ---------- |
  | Arcadia             | 1    | 116      | 0           | 0          |
  | Kult                | 0    | 3        | 0           | 0          |
  | Kingmaker           | 2    | 14       | 10          | **0**      |
  | Berlin en tinieblas | 14   | 102      | 90          | **0**      |

  **Total: 0.** The zero is meaningful rather than vacuous: Berlín contributes 90 sessions with an arc and Kingmaker 10, so there was somewhere for incoherence to hide. Arcadia and Kult are vacuous (no session points at an arc) and prove nothing either way. §2 can therefore ship its 422 without it ever firing on pre-existing data.

- [x] 1.4 Nothing to repair — 1.3 found zero. The repair path stays shipped and tested for the rows that a future mistake creates.

## 2. The coherence invariant

- [x] 2.1 Give `resolveArcChapterSlugs` (`server/utils/arc-chapter.ts`) the **effective** sub-campaign — from the body when `subCampaignSlug` is present, else the stored one — and refuse a cross-sub-campaign arc with 422 naming both. Keep the existing chapter/arc 422 untouched.
- [x] 2.2 Pass it through from `sessions/index.post.ts` and `sessions/[slug]/index.put.ts`.
- [x] 2.3 Integration tests: the refusal on create and on update; the single-request move that must SUCCEED (`subCampaignSlug` + `arcSlug` together); a session with no arc unaffected; and that a refused request modified nothing.
- [x] 2.4 **Mutate it**: drop the comparison and require 2.3 to go red. Then restore, and `grep -rn 'DISABLED\|MUTATION\|MUTANT'` the tree before committing.

## 3. Arc move cascades to its sessions

> **Surfaced while doing this:** closing the slug path in §2 left the **raw `arcId`** form wide open
> — it never reaches `resolveArcChapterSlugs`. Found because the audit fixture still managed to
> build an incoherent row after §2 shipped. Now checked on the FINAL arc id in both handlers,
> whichever field named it, with its own test. Without it the invariant was a fiction.

- [x] 3.1 In `arcs/[slug]/index.put.ts`, when `subCampaignSlug` changes the arc's sub-campaign, reassign its sessions in the same transaction and return `movedSessions`.
- [x] 3.2 Give that handler a zod schema — it is the only one of the three using bare `readBody` (`index.put.ts:19`), so `subCampaignSlug: 123` currently reaches the query unvalidated.
- [x] 3.3 Align the truthiness divergence: sessions uses `if (body.subCampaignSlug)` where arcs/quests use `!== undefined`, so an empty string is silently ignored in one and a 404 in the others. Pick `!== undefined` and cover the empty string with a test. **Done in §2**, since the same line had to move above the arc resolution anyway.
- [x] 3.4 Tests: 12 sessions follow; a no-op reports 0; the chapters report the new sub-campaign with no chapter row written; rollback leaves both sides untouched.
- [x] 3.5 `aleph arc update` prints the moved-session count.

## 4. Chapters join the concept

- [x] 4.1 `chapters/index.get.ts` — list campaign-wide when unparameterised instead of the current hard 400, add `subCampaignSlug`, and **scope `arc_id` to the route's campaign** (today it returns another campaign's chapters verbatim).
- [x] 4.2 Project `subCampaignId`/`subCampaignName`/`subCampaignSlug` through the arc join, on list and detail.
- [x] 4.3 Reject `subCampaignSlug`/`subCampaignId` on chapter POST/PUT with 422 naming the arc as the route. Assert it is **refused**, not accepted-and-discarded.
- [x] 4.4 `chapters/index.post.ts:18` — validate that `arcId` belongs to the route's campaign before inserting.
- [x] 4.5 `aleph chapter list --subcampaign`, plus the sub-campaign column and the no-argument listing.

## 5. Stop hiding the sub-campaign in responses

- [x] 5.1 Left-join in `arcs/index.get.ts` and `quests/index.get.ts` for `subCampaignName`/`subCampaignSlug`, as `sessions/index.get.ts:78` already does.
- [x] 5.2 `quests/[slug]/index.get.ts` returns the raw row — project the sub-campaign name and slug.
- [x] 5.3 `arcs/index.post.ts` returns `{id,name,slug}` only; echo the sub-campaign, as the sessions POST does.
- [x] 5.4 Sub-campaign column in `aleph arc list` and `aleph quest list`.

## 6. Types

- [x] 6.1 Add `SubCampaign`, `Arc` and `Chapter` to `app/types/api.ts`; all sub-campaign client code currently runs on `Record<string, unknown>`.
- [x] 6.2 Add `subCampaignId`/`subCampaignName` to `Quest` (`app/types/api.ts:205`) — the server already returns it.

## 7. UI — the filter is the point

- [x] 7.1 **Decided: mirrored, not extracted.** Three chip rows now exist (sessions, arcs, quests) and they are identical, so the abstraction is tempting — but extracting means refactoring the working sessions page inside a UI change, and the markup may still diverge (the quests one sits above a second filter it has to compose with). Revisit when a fourth appears.
- [x] 7.2 Arcs list: chip filter driving `subCampaignSlug` (server-side, not a client `.filter()`), hidden when the campaign has one sub-campaign, plus a badge per row.
- [x] 7.3 Quests list: the same chip filter, **composing** with the existing status filter rather than replacing it.
- [x] 7.4 Arc form: sub-campaign picker defaulting to the campaign default; today `arcs/index.vue:108` sends only `{ name }`.
- [x] 7.5 Quest form: the same in `QuestForm.vue`, plus the sub-campaign on the quest detail page.
- [x] 7.6 Arc detail: show the arc's sub-campaign, and the inherited one on each inline chapter, read-only, naming the arc as the way to change it.
- [x] 7.7 Surface the moved-session count in the arc edit flow.
- [x] 7.8 Put the sub-campaigns page in the sidebar — it is currently reachable only from a button on the sessions list.
- [x] 7.9 i18n keys for every new string, in `i18n/locales/en.json` AND `i18n/locales/es.json` (the canonical directory — never `locales/` or `app/i18n/locales/`).

## 8. Close the pre-existing test gaps this touches

- [x] 8.1 Extended to all three. **Finding from mutating it:** removing the arc/quest reassignment makes the DELETE return **500, not a failed assertion** — the FK refuses to drop a sub-campaign arcs still point at. So the reassignment's _existence_ was already guaranteed by the database; what the new assertions add is that the destination is the **default** specifically.
- [x] 8.2 An e2e that creates a sub-campaign **through the UI** — the one that exists creates it by API and only then looks at the page.
- [x] 8.3 Component/e2e for the two new filters. Check what `playwright.config.ts` inherits from `.env` before trusting a green run as coverage.

## 9. Ship

- [x] 9.1 `npm run format:check` — it runs before the tests in CI and fails the whole job.
- [x] 9.2 **2243 unit / 169 files green. 97/97 across the six integration suites this touches. 4/4 e2e** (one needed a retry on the documented `helpers.ts:125` "New Campaign" race, not on anything here).

  Two reds that are NOT this change, verified rather than assumed: `backup-api` fails 2 admin-permission tests **identically with these changes stashed**, and a full-suite run reports ~35 red files with only ~6 red tests — suite-level failures from contention, since every file involved passes in isolation and together.

  `npx eslint .` reports 7 errors, all in `scripts/eval-search.ts` — an UNTRACKED search bench from 2026-09-18 that is not part of this change and blocks the pre-push hook for any push. Left untouched.

- [x] 9.3 Update `docs/claude-skill.md` and `.claude/skills/aleph-cli/SKILL.md` **together**, and bump the skill's frontmatter version.
- [ ] 9.4 Push, confirm the gated deploy went green, and bump the `aleph` pin in mago20.
