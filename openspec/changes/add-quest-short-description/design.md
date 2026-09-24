## Context

The quests list was already fixed once, yesterday: it interpolated `{{ q.description }}` raw inside
a `<p>`, so the `**` printed literally and HTML collapsed every newline. That was fixed by routing
the description through `buildExcerpt` and clamping with `line-clamp-2`.

That resolved the visual damage but not the underlying problem: **an excerpt is a cut by length,
not a summary**. It takes the first 240 characters, which tend to be the opening scene and almost
never the point of the quest.

The repo already has an exact precedent for what is needed: `entities.board_summary`, added in
migration `0020_board_summary.sql` as nullable `text`, validated with
`z.string().max(120).nullable().optional()`, and exposed in the CLI as `--board-summary`. This
change is that same pattern applied to `quests`, and it should resemble it as closely as possible
rather than invent a new shape.

Constraints that frame the design:

- **SQLite + Drizzle**, migrations applied at boot. A nullable `ALTER TABLE ... ADD COLUMN` does not
  rewrite the table and does not block.
- **Production holds 26 quests**, none with the field. The screen must be correct with the field
  empty in 100% of rows from day one, not only once it has been filled in.
- **The CLI is part of the contract**, not an extra: the project's `CLAUDE.md` requires assessing
  CLI impact for any data-model change, and updating both skill files together.
- **CI does not run Playwright.** It runs `format:check`, `eslint`, `vitest run tests/unit/`, the
  integration suite and the build. Any guarantee that must hold on its own has to live in unit or
  integration tests.
- **Language split**: `openspec/` is written in English, as is the rest of the repo's engineering
  documentation; the product's user-facing copy (labels, placeholders, help text) is Spanish.

## Goals / Non-Goals

**Goals:**

- Let the Narrator write the line that summarises a quest, instead of having it cropped for him.
- Show that line **whole** in the list: no ellipsis, no line clamp, no excerpt.
- Leave no quest mute while the field is unfilled.
- Have the field exist equally in database, API, export/import, UI and CLI — with none of the five
  layers left behind.

**Non-Goals:**

- Filling in short descriptions for the 26 existing quests. That is content, not code; the fallback
  exists precisely so it need not be done in one pass.
- Retiring `buildExcerpt`. It remains the fallback.
- Fixing the quest-status mismatch (`abandoned` / `on_hold` unreachable). Adjacent, real, and
  another proposal's job.
- Extending the field to arcs, chapters, sessions or organizations. If it works here, that gets
  proposed separately, with evidence.

## Decisions

### D1 — A field of its own, not something derived from the long description

**Decision:** a new `short_description` column, independent of `description`.

**Alternative rejected:** extracting the first sentence, or agreeing that the first paragraph of
`description` is the summary. Both turn the long description into a format with invisible rules:
anyone who opens with a narrative paragraph — which is exactly what every current quest does —
breaks the summary without noticing. A separate field is explicit and has no way to surprise anyone.

### D2 — Plain text, not markdown

**Decision:** `shortDescription` is plain text. It is interpolated directly, with no `MDC` and no
`buildExcerpt`.

**Rationale:** this is what makes the "shown in full" requirement safe. A markdown field in a card
forces you to render it, and partially rendering markdown is exactly what broke this very screen
yesterday. With no syntax to interpret, there is nothing to break.

**Accepted cost:** no bold and no `:entity-link{}` in the short description. It is a small price and
the same one `boardSummary` already pays.

**How it is defended:** validation does not reject markdown — that would be hostile and brittle —
but the UI never interprets it, so a `**` typed there renders as `**`. That is visible, honest and
fixable by whoever wrote it, unlike yesterday's silent failure.

### D3 — 200 characters, and the cap is what makes the promise true

**Decision:** `.max(200)`, enforced server-side.

The limit is not a style preference: **it is the only thing that lets us promise the text is shown
in full**. With no cap, "shown whole, never trimmed" is a promise any long string breaks, and we
would be back to yesterday's wall of text by another route.

200 characters fit in two card lines at phone width. The `boardSummary` precedent is 120, which
works for a graph label but is too tight for the point of a quest.

**Where it is enforced:** on the server, the only place that cannot be bypassed. The form shows a
counter and warns on overflow, but that is a courtesy, not the guarantee.

### D4 — Fallback to the excerpt, and the order matters

**Decision:** the list resolves in this order:

1. Is there a `shortDescription`? → show it **whole**, with no `line-clamp`.
2. No, but there is a `description`? → `buildExcerpt` at 240 with `line-clamp-2`, which is today's
   behaviour.
3. Neither? → show no description text at all.

**Alternative rejected:** showing nothing without a short description. That would have left all 26
current cards mute on deploy day, turning an improvement into a visible regression until someone
walked the whole campaign by hand.

**The load-bearing detail:** branch 1 and branch 2 carry **different CSS classes** (without and with
`line-clamp-2`). It is tempting to leave the clamp on both "just in case" — and that would be wrong:
a 200-character cap with a clamp on top can still trim at narrow widths, and then the field's promise
quietly stops holding exactly where nobody is looking. Clamping applies only to text whose length is
not guaranteed.

### D5 — One definition of the limit

**Decision:** 200 is declared **once**, in `shared/utils/quest-short-description.ts`, and read from
there by the server's zod schema, the form's counter and the tests.

**Rationale:** it is the pattern this repo already applies to shared rules, and the same reason
`buildExcerpt` was moved to `shared/` yesterday rather than copied. A 200 hand-written in three
places becomes a 200, a 250 and a 200 the first time someone adjusts it, and the disagreement only
surfaces when a save fails with a message the UI swore could not happen.

### D6 — Export/import is verified, not assumed

`campaign-export.ts` does `db.select().from(quests)` and `campaign-import.ts` inserts the rows it
receives, so it **should** carry the new column with no change at all.

"Should" is not a verification. This repo already has a recorded case where a successful `parse()`
proved nothing because zod silently strips unknown keys, and that is exactly the shape this failure
would take: an export that carries 26 quests, an import that creates all 26, and the short
description gone without a single error. There is a dedicated task to export, re-import and
**compare the field**, not to read the code and feel reassured.

## Risks / Trade-offs

- **The migration runs against production (26 quests, ~171 MB).** → A nullable `ALTER TABLE ADD
COLUMN` in SQLite is a metadata change: it does not rewrite rows and needs no window. Rollback is
  to stop writing the field; the leftover column is inert.

- **Two text fields in one form invite pasting the same content into both.** → The placeholder and
  help text say what each is for, and the detail page renders them with different hierarchy
  (standfirst vs body), which is where duplication becomes obvious. No anti-duplicate validation is
  added: that would be second-guessing the author.

- **The 200-character cap may annoy anyone who wants three sentences.** → It is the constraint that
  holds up D3's promise, and the number lives in exactly one place (D5), so raising it is a constant
  and a test. What cannot be done is raise it and keep promising it fits.

- **200 characters with no spaces (a pasted URL) would overflow the card horizontally.** → The card
  already carries word-break utilities; there is a task that checks this explicitly, because it is
  the one case where "200 characters" and "fits in two lines" stop coinciding.

- **Whatever e2e test is written will not run in CI.** → Accepted and stated: the guards that
  actually protect this are the unit and integration ones. The e2e is a local tool, and saying so
  avoids the trap of treating as enforced something that is merely observed.

## Migration Plan

1. Schema + migration `0038`, with its entry in `meta/_journal.json`.
2. Server: zod, POST, PUT and both GETs.
3. `shared/utils/quest-short-description.ts` with the limit and its test.
4. UI: type, form, list (with D4's fallback rule), detail page, i18n ES + EN.
5. CLI: the option on `create` and `update`, the column in `list`, and both skill files together.
6. Export → import round-trip verification (D6).
7. Deploy: push to `master`, which runs `test` → `integration-test` → `deploy`. The migration
   applies itself at boot.

**Rollback:** the field is optional in every layer, so reverting the code leaves the column
populated and unread, breaking nothing. There is no down migration.

## Open Questions

None. The two that existed — the limit, and what to show when the field is empty — were decided
before this was written: 200 characters, and fall back to the excerpt.
