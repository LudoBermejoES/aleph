## 1. Database

- [x] 1.1 Add `shortDescription: text('short_description')` to `quests` in
      `server/db/schema/sessions.ts`, next to `description`.
- [x] 1.2 Create `server/db/migrations/0038_quest_short_description.sql` with
      ``ALTER TABLE `quests` ADD `short_description` text;`` and register the `idx: 38` entry in
      `meta/_journal.json`, following the `0020_board_summary.sql` pattern.
- [x] 1.3 Boot the server against an empty database and confirm the migration applies on its own.
      Check it **also** against a copy of the development database, which is the one with rows: a
      migration only ever tested on an empty file proves nothing about a populated table.

## 2. The limit, in exactly one place

- [x] 2.1 Create `shared/utils/quest-short-description.ts` exporting
      `QUEST_SHORT_DESCRIPTION_MAX_LENGTH = 200`, with a comment explaining that the cap is what
      makes the "shown in full" promise true (design D3) and that this is why it is not duplicated.
- [x] 2.2 Unit test in `tests/unit/shared/` pinning the value, so it is the single place to change.
- [x] 2.3 **Guard**: a test that walks the short-description code paths (zod schema, form) and fails
      if a literal `200` appears instead of the imported constant. This is what stops D5 eroding on
      the first hurried edit.

## 3. API

- [x] 3.1 Add `shortDescription: z.string().max(QUEST_SHORT_DESCRIPTION_MAX_LENGTH).nullable().optional()`
      to the schema in `quests/index.post.ts`.
- [x] 3.2 Same in `quests/[slug]/index.put.ts`, propagating with the `!== undefined` pattern the
      other fields already use — **not with `if (body.shortDescription)`**, which would treat the
      empty string and null as "not sent" and make the field impossible to clear.
- [x] 3.3 Confirm both GETs (list and detail) return the field. If they project columns explicitly,
      add it; if they `select()`, record that this was verified rather than assumed.
- [x] 3.4 Integration: create with a short description and **read it back**, comparing the exact
      string. A 200 response does not prove it was stored: zod silently strips unknown keys, which
      is precisely the shape this failure would take.
- [x] 3.5 Integration: 201 characters → validation error, and assert **nothing was created or
      modified**.
- [x] 3.6 Integration: sending `null` clears it; **omitting the key leaves it untouched**. These are
      two different cases and the second is the one that silently breaks.

## 4. UI — form and detail page

- [x] 4.1 `app/types/api.ts`: `shortDescription: string | null` on `Quest`.
- [x] 4.2 `app/components/forms/QuestForm.vue`: a single-line text field above the long description,
      with a character counter reading the shared constant and a warning on overflow. The counter is
      a courtesy; the guarantee is server-side.
- [x] 4.3 `app/pages/campaigns/[id]/quests/[slug]/index.vue`: standfirst above the description,
      typographically distinct, interpolated as PLAIN TEXT — never through `<MDC>` (design D2).
- [x] 4.4 i18n in `i18n/locales/es.json` and `en.json`: label, placeholder and help text saying what
      it is for as against the long description. Edit **only** `i18n/locales/`; `locales/` and
      `app/i18n/locales/` are stale duplicates that are never loaded. The Spanish copy is the one
      users read, so write it as product copy, not as a translation of the English key.
- [x] 4.5 Check the detail page renders no empty gap when there is a standfirst and no long
      description, and none the other way round.

## 5. UI — the list

- [x] 5.1 `app/pages/campaigns/[id]/quests/index.vue`: implement D4's fallback rule in this order —
      short description whole and **without `line-clamp`**; else an excerpt of the long one **with
      `line-clamp-2`**; else render nothing.
- [x] 5.2 The two branches carry different CSS classes. Write that down in a comment: putting the
      clamp on both "just in case" trims the short description at narrow widths and breaks exactly
      what the field promises.
- [x] 5.3 Extend the guard in `tests/unit/components/quest-list.test.ts` — the one that READS the
      page, not the block that re-implements its logic — to require that the short-description
      branch carries no `line-clamp` and the excerpt branch does.
- [x] 5.4 Mutation-test that guard: swap the classes and require red. Then **remove the mutation and
      `grep` to confirm no trace is left** — this project has already shipped a
      `data-testid="…-DISABLED"` that was an unreverted mutation.
- [x] 5.5 Check that a 200-character short description with no spaces neither overflows the card nor
      causes horizontal page scroll at phone width.

## 6. CLI

- [x] 6.1 `cli/src/commands/quest.js`: `--short-description <text>` on `create` and `update`,
      following the `--board-summary` pattern in `entity.js` (empty string → `null`).
- [x] 6.2 Show the short description in `quest list`.
- [x] 6.3 CLI integration: set the short description, **read it back** and compare; then clear it
      with `""` and confirm the long description is untouched.
- [x] 6.4 Confirm that text longer than 200 characters makes the CLI exit non-zero **and print the
      server's validation error**, rather than reporting success. A command that accepts input and
      silently does nothing is this repo's recurring failure.
- [x] 6.5 Update `docs/claude-skill.md` and `.claude/skills/aleph-cli/SKILL.md` together, bumping the
      latter's `version`. Run the endpoint-parity check if one exists.

## 7. Export / import — verified, not assumed

- [x] 7.1 Export a campaign holding quests with and without a short description, re-import it, and
      **compare the field on both sides**. Reading `campaign-export.ts` and concluding that
      `select()` carries it does not count.
- [x] 7.2 A unit or integration test pinning that round trip, so the field cannot vanish silently if
      someone later moves the export to explicit columns.

## 8. Closing out

- [x] 8.1 E2E in `tests/e2e/quests.spec.ts`: create with a short description, see it whole in the
      list, plus a control confirming a quest without one still shows the excerpt.
- [x] 8.2 State in the e2e file itself that **CI does not run Playwright** (it runs format, eslint,
      `tests/unit/`, integration and build), so nobody treats it as enforced.
- [x] 8.3 `npm run format:check`, `npx eslint .` and the full unit suite — **on Node 25**:
      `better-sqlite3` is built for ABI 141 and a Node 24 shell turns ~35 files red for a reason
      that has nothing to do with this change.
- [x] 8.4 Integration suite with the server running.
- [x] 8.5 Push to `master` and confirm all three jobs (`test`, `integration-test`, `deploy`), citing
      the run id. Green observed is not green enforced: this repo cannot have branch protection.
- [x] 8.6 Check against the deployed server that a real quest accepts and returns the field, then
      bump the `aleph` pin in mago20.
