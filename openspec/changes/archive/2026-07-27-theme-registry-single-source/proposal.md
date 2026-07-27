## Why

`openspec/specs/campaign-themes/spec.md` enumerates the built-in themes **by name** under a
`SHALL` clause, and lists ten. `app/utils/themes.ts` holds **twelve**. The spec is wrong, and
the interesting part is not that it drifted — it is that **it was never right**.

**The enumeration has been inaccurate for 100% of its existence.** `superhero` did not creep in
later. It shipped in `ca67667` — the very commit that authored the ten-item list — whose own
message reads:

> Implements 11 built-in themes (dark-fantasy, cyberpunk, cosmic-horror,
> high-fantasy, western, steampunk, eldritch, fey-wilds, undead, superhero,
> default) as CSS variable overrides applied via data-theme on the campaign
> layout's `<main>` element.

That single commit added `+  { id: 'superhero', … }` to `app/utils/themes.ts` **and**
`openspec/changes/campaign-themes/specs/campaign-themes/spec.md` with the ten-name list, and it
is the commit that created `openspec/specs/campaign-themes/spec.md` on archive
(`git log --diff-filter=A --follow` names exactly `ca67667`). `mage-ascension` (`27f3ec9`) is
merely the **second** offender against a rule that has never once held.

So this is not a stale-list bug to be patched. A `SHALL` clause that no gate reads and that was
false on the day it was written is not a requirement — it is a comment wearing a requirement's
clothes. Patching it to say "twelve" buys one commit of accuracy and rebuilds the same trap.

The drift is wider than the one list:

- `openspec/specs/immersive-campaign-themes/spec.md` hardcodes **"All 10 themes"** in a scenario
  title (line 28) and **"all 10 theme heading and body fonts"** in another (line 42). The line-28
  scenario also says "all **6** typography tokens" while its own requirement body names **5** —
  wrong on both counts.

Meanwhile the machinery that _should_ be the gate is only half-built. `toHaveLength(12)` in
`tests/unit/components/campaign-themes.test.ts` is real and current, and that file does name
both newer themes. But **`tests/unit/css/themes.test.ts` does not iterate the registry** — it
declares its own hardcoded `const THEMES = [...]` of eleven strings
(`tests/unit/css/themes.test.ts:7-19`). It is a _third_ parallel list, currently accurate by
hand. Adding a theme to `app/utils/themes.ts` without a CSS token block therefore **passes CI
today**. And nothing anywhere reads `app/assets/css/main.css`: `grep -rn "main.css" tests/`
returns nothing, so no test asserts that a registry theme has a colour-token block at all.

## What Changes

- **Demote the enumeration to non-normative.** In `campaign-themes` → `Built-in RPG themes`,
  `SHALL provide at least 10` stays as the **only** normative count. The by-name list stops being
  a `SHALL` and becomes an explicitly illustrative note that names
  `app/utils/themes.ts` as the registry of record.
- **De-count the `immersive-campaign-themes` scenarios.** "All 10 themes define all 6 typography
  tokens" and "font files for all 10 theme heading and body fonts" are rewritten over **every
  theme in the registry**, so neither can go stale on the next theme.
- **Name the enforcement point, and close the hole.** Two new requirements make
  registry-to-CSS parity the gate, derived from `CAMPAIGN_THEMES` rather than from a
  hand-maintained list: every registry theme must have a colour-token block in `main.css`
  (currently unasserted **anywhere**) and a complete theme-token block in `themes.css`
  (currently asserted for 4 of 10 tokens, against a hardcoded list). The one **opt-in** token,
  `--theme-heading-color` (added by `cb7c1bc` after this change was written), stays out of the
  mandatory set; the gate asserts its opt-in property in both directions instead — see `design.md`
  decision 5.
- **`superhero` and `mage-ascension` become correct as a consequence**, not as a hand-patch: the
  note that mentions them is non-binding and the binding statement is derived from the registry.

## Capabilities

### Modified Capabilities

- `campaign-themes`: `Built-in RPG themes` is restated — normative floor kept, enumeration
  demoted to a note pointing at the registry. One new requirement,
  `Theme registry is the single source of truth`, makes registry-derived CSS parity a CI gate and
  covers the `main.css` colour-token hole.
- `immersive-campaign-themes`: `Theme typography tokens` and
  `Google Fonts loaded on demand via @nuxt/fonts` are restated with their hardcoded "10"/"6"
  counts replaced by registry-wide wording. One new requirement,
  `Theme token parity is enforced against the registry`, makes the `themes.css` token-block
  assertion registry-derived and complete.

### Unaffected Capabilities

- No other capability names the theme catalogue. Individual theme **slugs** appearing inside
  scenarios elsewhere (`dark-fantasy`, `cyberpunk`, `steampunk`, `high-fantasy`, `western`) are
  deliberately left alone — see `design.md`; those are exemplars pinning concrete behaviour, not
  an enumeration of the catalogue.

## Impact

This is a **documentation-catch-up change**. The feature is fully built and shipped; twelve
themes exist in the registry, all twelve have blocks in both `main.css` (lines 141–447) and
`themes.css` (lines 197–408), and the 55 tests across the two theme test files pass. Almost all
of the work is spec editing.

**Specs (the bulk of it):** `openspec/specs/campaign-themes/spec.md` and
`openspec/specs/immersive-campaign-themes/spec.md`, applied from this change's deltas on
archive. **No hand-editing of `openspec/specs/` as part of authoring this change.**

**Tests (the one piece of real work, because item 3 found a genuine hole):**
`tests/unit/css/themes.test.ts` — replace the hardcoded `THEMES` array with a list derived from
`CAMPAIGN_THEMES`, extend the per-theme assertions from 4 tokens to the full 10, and add a
`main.css` colour-token parity check. `tests/unit/components/campaign-themes.test.ts` — fix the
`expectedIds` list and the "includes all 11 themes" title that asserts 12.

**Application code:** none. `app/utils/themes.ts`, `app/assets/css/main.css`,
`app/assets/css/themes.css`, `app/components/ThemePicker.vue` and `nuxt.config.ts` are all
already correct and are **not** touched.

**Server API / data model / migrations:** none. No endpoint, schema, or column changes.

**aleph-cli (explicitly assessed per project rules):** **no impact.** No API endpoint, auth flow,
or data model changes here. The CLI has no theme command and the `campaigns.theme` column is
untouched, so `cli/src/commands/`, `cli/src/lib/client.js`, `config.js`, the login/logout flows,
`docs/claude-skill.md`, and `.claude/skills/aleph-cli/SKILL.md` all stay as they are.

**i18n:** none. No new user-facing strings; theme display names already live in the registry.

**E2E:** none. `tests/e2e/campaign-themes.spec.ts` is unaffected — no behaviour changes.
