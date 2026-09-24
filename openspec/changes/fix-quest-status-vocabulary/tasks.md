## 1. The vocabulary, in one place

- [x] 1.1 Create `shared/utils/quest-status.ts` exporting `QUEST_STATUSES`
      (`active`, `completed`, `failed`, `abandoned`), a `QuestStatus` type, the transition map, and
      `canTransitionQuestStatus`. Record in a comment that two independent declarations are what
      caused the defect, so the next reader knows why it lives here.
- [x] 1.2 Unit tests over the map: the three closing edges from `active`; the three reopening edges
      back to `active`; `completed -> failed` and `completed -> abandoned` refused; an unrecognised
      status able to reach `active`; and same-to-same not counting as an escape.
- [x] 1.3 Mutation-test those: drop the `completed -> active` edge, and drop the unknown-status
      rule, and require a different test to go red for each. Remove the mutations and `grep` for
      residue afterwards.

## 2. Server

- [x] 2.1 `server/services/sessions.ts` re-exports from the shared module and drops its own inline
      table. Keep the existing export names so no caller has to change.
- [x] 2.2 Both zod enums (`quests/index.post.ts`, `quests/[slug]/index.put.ts`) built from
      `QUEST_STATUSES`, not typed out.
- [x] 2.3 **Guard**: a test that fails if either API file spells a status literal instead of reading
      the shared list. This is what stops the two vocabularies drifting apart a second time.
- [x] 2.4 Integration: `abandoned` is accepted from `active` — the value the UI has been offering
      and the server rejecting.
- [x] 2.5 Integration: `on_hold` is rejected on create, so the frozen-row scenario cannot recur.
- [x] 2.6 Integration: a completed quest reopens to `active`, and a completed quest refused a jump
      to `failed` keeps its stored status.

## 3. Migration

- [x] 3.1 Count the distinct status values across all four production campaigns **before** touching
      anything, and record the numbers. Kingmaker's row is the one known case; the point of counting
      is to find out whether it is the only one.
- [x] 3.2 `server/db/migrations/0039_quest_status_vocabulary.sql`:
      `UPDATE quests SET status = 'active' WHERE status NOT IN (...)` over the four values — written
      as NOT IN rather than `= 'on_hold'`, so any other stray value is rescued too.
- [x] 3.3 Journal entry `idx: 39`.
- [x] 3.4 Apply it to a copy of the populated database and verify: the stray rows became `active`,
      every row already in the vocabulary kept its status, and no other column changed.
- [x] 3.5 Drop the hand-maintained status comment from `server/db/schema/sessions.ts` or point it at
      the shared module — it is a fifth copy of the list.

## 4. UI

- [x] 4.1 `app/components/forms/QuestForm.vue`: generate the `<option>` list from `QUEST_STATUSES`
      instead of hard-coding four values. A typed dropdown is a third declaration, and it is the one
      that produced a visible, enabled control the server refuses.
- [x] 4.2 Check all four i18n label keys resolve in **both** `es.json` and `en.json`, so a generated
      option cannot render as a raw slug.
- [x] 4.3 Component guard: the rendered options equal the shared vocabulary. Mutate by adding a
      fifth hard-coded option and require red.

## 5. CLI

- [x] 5.1 `cli/src/commands/quest.js`: `--status` help on `list` and `update` naming the four values.
- [x] 5.2 CLI integration: set `abandoned`, read it back; reopen a `completed` quest, read it back.
- [x] 5.3 Update `docs/claude-skill.md` and `.claude/skills/aleph-cli/SKILL.md` together, bumping the
      latter's `version`.

## 6. The test that pinned the old behaviour

- [x] 6.1 Rewrite `tests/unit/server/session-service.test.ts` against the new rules. Its
      `completed -> active === false` assertion mirrored the implementation, not a stated rule — no
      requirement anywhere said a completed quest was final.
- [x] 6.2 Put the reasoning in the test file itself, next to the changed assertion, rather than only
      in the commit message.

## 7. Closing out

- [x] 7.1 `npm run format:check`, `npx eslint .`, full unit suite — **on Node 25**.
- [x] 7.2 Integration suite with the server running.
- [ ] 7.3 Push and confirm all three CI jobs, citing the run id.
- [ ] 7.4 **Against the live server**: move `el-anillo-de-bodas-robado-a-svetlana` out of its frozen
      state and back, proving the incident that motivated this change is actually closed. Re-count
      the status values across the four campaigns and confirm nothing is outside the vocabulary.
- [ ] 7.5 Bump the `aleph` pin in mago20.
