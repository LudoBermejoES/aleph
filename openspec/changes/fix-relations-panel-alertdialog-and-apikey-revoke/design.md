## Context

Both defects were named in `openspec/changes/archive/2026-03-27-api-keys/tasks.md` (9.4) and
`openspec/changes/archive/2026-05-23-editable-relations-on-detail-pages/tasks.md` (7.4/9.3/9.4) as
unresolved `- [ ]` items in ALREADY-ARCHIVED specs. Both are real, live, one-line-fixable defects,
not stale paperwork — confirmed independently before touching any code (see "Verification" below).

## Decision 1 — API-keys revoke: move `useI18n()` to the top of `setup`

The only viable fix. `useI18n()` (and every other composition-API composable that reads
`getCurrentInstance()`) is documented by vue-i18n to work only synchronously during a component's
`setup()`. Calling it lazily inside an event handler — the exact anti-pattern this bug is — is not
a style preference; it throws. There is no alternative implementation to weigh here.

The real decision is **how to make this regression impossible to reintroduce silently**: today
there is no test that renders `app/pages/settings/index.vue` at all, which is exactly how a
one-line regression like this survived from 2026-03-27 to 2026-09-01 without detection — nobody
mounts the page, so nobody calls the handler, so nobody hits the throw. The new
`tests/unit/components/settings-page.test.ts` mounts the REAL page (not a mock of it) and clicks
the REAL "Revoke" button, asserting on the DELETE call and the resulting DOM — not on "no exception
was thrown", because a thrown-but-swallowed exception is exactly what makes this bug invisible in
casual manual testing (Vue's async error handling logs it to the console rather than crashing the
page, so a developer clicking through the settings page without watching devtools sees... nothing
happen, which reads as "did I actually click the button").

## Decision 2 — DialogContent: forward `$attrs`, don't relax the E2E assertion

Two fixes were on the table and they are NOT equivalent (already noted in the archived task):

- **(a) Forward `role` (and any other non-declared attribute) to the inner reka-ui
  `<DialogContent>`.** Chosen. Gives every future caller of this wrapper the same guarantee reka-ui
  itself provides — an attribute you pass reaches the rendered element — and gives THIS caller
  (`EntityRelationsPanel.vue`, a destructive confirmation) the accessibility semantics it explicitly
  asked for.
- **(b) Change the four E2E specs' selector from `[role="alertdialog"]` to `[role="dialog"]`.**
  Rejected. This project has already logged, by count, more than half a dozen instances of "a test
  that asserts the bug" (`aleph/CLAUDE.md`, "The single most repeated defect in this project..."),
  and this would be exactly that pattern again: the spec's own requirement
  (`entity-relations-panel` § "Delete relation from detail page") already says a destructive
  confirmation should read as an alert dialog to assistive tech, and (b) would make the test
  agree with the bug rather than with the requirement.

**Implementation, mirrored from an existing sibling**: `app/components/ui/sheet/SheetContent.vue`
already has this exact problem solved (`defineOptions({ inheritAttrs: false })` +
`v-bind="{ ...forwarded, ...$attrs }"` on the inner reka-ui component) — `DialogContent.vue` and
`DialogScrollContent.vue` never picked up the same pattern. This change fixes `DialogContent.vue`
only, because it is the one component actually receiving a `role` prop anywhere in the codebase
(`grep -rn 'role="alertdialog"' app` returns exactly one call site, `EntityRelationsPanel.vue:190`,
and `DialogScrollContent.vue` has zero external usages at all). `DialogScrollContent.vue` carries
the identical latent bug and is left as a known, harmless-today gap — noted here rather than
silently fixed alongside, in case a reviewer wants it addressed as its own thing.

Why this doesn't need a server-side change or a data-model change: `role` is a pure
presentation/accessibility attribute; the DELETE call itself was never the broken part (task 7.4
in the archived tasks.md already established "the dialog SÍ opens" — only the ARIA role was lost).

## Verification before touching code

Both diagnoses were re-measured independently rather than trusted from the triage note, per the
project's own repeated lesson about confidently-wrong prior measurements:

- **API keys**: read `app/pages/settings/index.vue:42` directly — confirmed `useI18n()` is called
  inside `handleRevoke`, not at the top of `setup`. Read `vue-i18n`'s own source
  (`node_modules/vue-i18n/dist/vue-i18n.mjs`) and confirmed the exact thrown message
  ("Must be called at the top of a `setup` function") matches the archived task's browser-measured
  transcript verbatim.
- **Relations panel**: reproduced the failure BEFORE writing any fix — ran
  `npm run test:e2e -- relations-panel-character.spec.ts relations-panel-location.spec.ts
relations-panel-organization.spec.ts` against the untouched code and got **4 failed / 9 passed**
  (6.5 min), the same 4 tests named in the archived task, each failing deterministically on both
  the initial attempt and the local retry (`retries: 1` outside CI, per `playwright.config.ts`) —
  ruling out ordinary flakiness as the explanation. Confirmed `app/components/ui/dialog/
DialogContent.vue` was byte-identical between `HEAD` and the commit that recorded
  "0 failed" (`9ac91c8`, 2026-08-31 23:45) — `git show 9ac91c8:app/components/ui/dialog/
DialogContent.vue | diff - app/components/ui/dialog/DialogContent.vue` produced no output — and
  further back, that its `v-bind="forwarded"` (without `$attrs`) pattern is present all the way to
  the file's introduction in `bf402f5` (initial project scaffold). After applying the fix, re-ran
  the same three spec files and got the alertdialog-related failures gone (see tasks.md 3.2 for the
  exact after-fix numbers) — the run also surfaced the ALREADY-DOCUMENTED, unrelated
  `helpers.ts:105`/`New Campaign button` setup race from `CLAUDE.md`'s own "43 e2e flaky" note,
  confirming that failure mode is real and separate from this defect, not something this change
  introduced or needs to fix.

## The CLAUDE.md contradiction — which measurement was wrong, and why

`aleph/CLAUDE.md`'s "43 e2e flaky con una causa NO confirmada" section records, for 2026-08-31: 275
passed / 43 flaky / **0 failed** for the full E2E suite. Today's independent re-run of exactly the
tests implicated (three `relations-panel-*.spec.ts` files) found 4 deterministic failures, twice
each (no retry rescued them) — which is the profile of a genuine failure, not the profile of
"flaky" (43 of which the same note describes as "pass on retry").

These two readings cannot both be describing the same code, and they don't need to: the
responsible file, `app/components/ui/dialog/DialogContent.vue`, is byte-identical between `HEAD`
and the exact commit (`9ac91c8`) that recorded the "0 failed" figure, and its attribute-forwarding
bug has been present, unchanged, since the file's first commit (`bf402f5`, project scaffold) — long
before 2026-08-31. A deterministic bug in unchanged code cannot have passed on one date and failed
on another; it either always failed this assertion or never did. It always did (confirmed by
reading the reka-ui internals: `role` is not in `DialogContentProps`, so it has always fallen to
`$attrs`, and `$attrs` on a single-root `<DialogPortal>` template has never had anywhere to land).

**Conclusion: the "0 failed" figure recorded 2026-08-31 is the wrong measurement.** It was not
re-derived from these four tests' actual pass/fail state on that run — most plausibly a
transcription of a different, narrower, or mis-summarized run, in the same family as this
project's other documented "measured wrong the first time" incidents (the progress-bar
cumulative-average trap, the `pgrep`-matches-itself trap, the wrong per-directory guard counts).
Today's reading is the one with saved traces (`test-results/*/trace.zip`, readable via
`npx playwright show-trace`) and an independent, code-confirmed causal mechanism; it is the one
kept. `CLAUDE.md` is corrected in the same commit as this change to say so, without inventing a
new full-suite number that was not actually measured (the full ~1h suite was not re-run here —
only the previously-implicated files were, before and after the fix).
