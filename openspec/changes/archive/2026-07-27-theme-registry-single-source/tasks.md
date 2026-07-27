> **This is a documentation-catch-up change.** The feature shipped long ago: twelve themes are
> in `app/utils/themes.ts`, all twelve have blocks in `main.css` (141–447) and `themes.css`
> (197–408), and the 55 tests in the two theme test files pass today. Groups 1–2 are therefore
> pure spec editing and are the bulk of the change. Group 3 is the only real code work, and it
> exists because auditing item 3 found the parity gate does **not** yet work the way it was
> assumed to — see `design.md` decision 4. Group 4 is verification.
>
> No task here touches `app/utils/themes.ts`, `app/assets/css/*.css`, `app/components/ThemePicker.vue`,
> or `nuxt.config.ts` — the shipped code is already correct.
>
> One token postdates this change: `--theme-heading-color` landed in `cb7c1bc`. It is **opt-in** —
> only `mage-ascension` declares it, the other eleven must not — so it must NOT join the mandatory
> token set, and the gate asserts the opt-in property instead. Tasks 2.6 and 3.9, `design.md`
> decision 5.

## 1. De-normalise the `campaign-themes` enumeration (spec editing)

- [x] 1.1 Restate `### Requirement: Built-in RPG themes` in
      `openspec/specs/campaign-themes/spec.md` from this change's delta: keep
      `SHALL provide at least 10` as the only normative count, and keep the colour-token sentence.
- [x] 1.2 Replace `The available themes SHALL be:` (line 13) with the registry-of-record pointer to
      `app/utils/themes.ts` plus the explicitly non-normative framing. The `SHALL` must not survive
      on the list itself.
- [x] 1.3 Extend the illustrative list to all twelve entries — adding `superhero` and
      `mage-ascension` — and note on `default` that it is rendered by the _absence_ of a
      `data-theme` attribute. This is item 4: the two names land as a consequence of the list
      becoming non-binding, not as the fix.
- [x] 1.4 Keep the existing `Theme tokens cover all UI elements` scenario verbatim, and add the two
      new scenarios (`The registry is authoritative over this document`,
      `The catalogue may grow without a spec change`).
- [x] 1.5 Leave the other four requirements in that spec untouched. Their exemplar slugs
      (`dark-fantasy`, `cyberpunk`, `steampunk`, `high-fantasy`, `western`) are deliberately
      preserved — `design.md` decision 2.

## 2. Remove the hardcoded counts from `immersive-campaign-themes` (spec editing)

- [x] 2.1 Restate `### Requirement: Theme typography tokens`, adding the registry-scoping sentence
      and the `default` exemption to the requirement body.
- [x] 2.2 Replace the `#### Scenario: All 10 themes define all 6 typography tokens` title and body
      (lines 28–31) with `Every registry theme defines every typography token`. Both numbers in
      that title are wrong: there are twelve registry themes, and the requirement names **five**
      tokens, not six.
- [x] 2.3 Convert the three surviving scenarios in that requirement to full Given/When/Then — they
      currently open on `**WHEN**` with no `**GIVEN**`, against `openspec/config.yaml`'s
      Given/When/Then rule.
- [x] 2.4 Restate `### Requirement: Google Fonts loaded on demand via @nuxt/fonts` and rewrite
      `font files for all 10 theme heading and body fonts` (line 42) over every theme in the
      registry.
- [x] 2.5 Leave these requirements untouched — none of them states a theme count:
      `SVG background texture per theme`;
      `Card and heading decoration tokens`;
      `Theme micro-animations with motion safety`;
      `themes.css file isolates all new theme declarations`;
      `Theme reaches Teleport-portalled components`.
- [x] 2.6 Fold in `--theme-heading-color`, which landed in `cb7c1bc` after this change was written
      and which decision 5 of `design.md` now covers. Name it in the ADDED requirement as an
      explicitly **opt-in** token that is **not** part of the mandatory nine, and state the
      two-directional property the gate must enforce (opted-in themes declare it; every other
      registry theme must not). Add the two scenarios for it, and reword
      `The enforcement test holds no list of its own` so its no-hardcoded-list clause bans mirroring
      the catalogue without banning an opt-in allowlist for optional tokens. This belongs in
      `immersive-campaign-themes`, not `campaign-themes` — `--theme-*` tokens live in `themes.css`,
      per the file-boundary split in decision 3.

## 3. Make registry-to-CSS parity a real gate (the only code work)

> Audited before writing these: `tests/unit/css/themes.test.ts:7-19` declares its own literal
> array of **eleven** slugs and never imports `CAMPAIGN_THEMES`; `grep -rn "main.css" tests/`
> returns **nothing**; and the per-theme loop asserts **4** of the 10 tokens each block defines.
> So adding a thirteenth theme with no CSS at all passes `npx vitest run tests/unit/` today.

> **Coordination note (as of authoring).** Concurrent work on the Mage theme's heading colour has
> already added a **second** consumer of that hardcoded array —
> `for (const theme of THEMES.filter((t) => t !== 'mage-ascension'))`, asserting the other themes
> do _not_ define `--theme-heading-color`. The literal list is getting more load-bearing, not less,
> which sharpens the case for 3.1: that new loop silently stops covering any theme added after it.
> Deriving the list keeps both loops correct with no further edit. Note also that
> `--theme-heading-color` is deliberately **opt-in** and must NOT join the mandatory token set in
> 3.2 — the ADDED requirement's nine tokens exclude it on purpose.

- [x] 3.1 In `tests/unit/css/themes.test.ts`, delete the hardcoded `const THEMES` array and derive
      the list: `import { CAMPAIGN_THEMES } from '../../../app/utils/themes'`, then
      `CAMPAIGN_THEMES.map((t) => t.id).filter((id) => id !== 'default')`. This is the change that
      makes the file a gate instead of a fourth parallel list.
- [x] 3.2 Extend the per-theme loop from 4 tokens to the 9 mandatory ones —
      adding `--theme-font-weight-heading`, `--theme-letter-spacing`, `--theme-text-transform`
      (required by `Theme typography tokens`) and `--theme-card-shadow`, `--theme-card-border`
      (required by `Card and heading decoration tokens`). Assert non-empty values, not just
      substring presence, so an empty declaration cannot pass.
- [x] 3.3 Add a `main.css` colour-token parity test covering the hole from group 3's audit note:
      read `app/assets/css/main.css`, and for every non-`default` registry theme assert a
      `[data-theme='<id>']` block exists and declares the colour tokens
      `Built-in RPG themes` makes mandatory (`--background`, `--foreground`, `--primary`,
      `--accent`, `--border`). Nothing asserts this at all today.
- [x] 3.4 Make the failure messages name the offending theme and token, so the CI output is
      actionable without opening the test (the ADDED scenarios require this).
- [x] 3.5 Confirm `themeBlock()`'s parsing still holds for all twelve blocks after 3.1 — it finds
      `[data-theme='x'] {` and slices to the next `\n}`, and `superhero`/`mage-ascension` have
      additional `[data-theme=…]` pseudo-element selectors in `themes.css` that the existing
      comment warns about.
- [x] 3.6 In `tests/unit/components/campaign-themes.test.ts`, fix the two cosmetic staleness bugs
      in the same family as the spec drift: the `it('includes all 11 themes')` title asserting
      `toHaveLength(12)` (line 11–13), and the `expectedIds` array (43–55) that omits
      `mage-ascension` and so silently under-checks via `toContain`.
- [x] 3.7 Deliberately **keep** `toHaveLength(12)` as a tripwire that forces a human to
      acknowledge each catalogue change — updating the number only, per `design.md`'s closing
      risk note. Bump it to match the registry rather than deleting it.
- [x] 3.8 Prove the gate works before trusting it: add a theme to `CAMPAIGN_THEMES` locally with no
      CSS, confirm the new tests fail and name it, confirm the same addition passed before 3.1,
      then revert. Do not commit the probe.
- [x] 3.9 Replace the two `--theme-heading-color` loops that `cb7c1bc` left behind (a literal
      `mage-ascension` test plus `THEMES.filter((t) => t !== 'mage-ascension')`) with a
      `HEADING_COLOR_OPT_IN` allowlist checked against the registry-derived list: opted-in themes
      must declare the expected value, every other registry theme must not declare it at all. Assert
      the allowlist is a subset of the registry, and assert the token is absent from both mandatory
      token sets, so 3.2 can never quietly absorb it. Extend 3.8's probe to cover both new failure
      modes (a token missing from a block that exists; a non-opted-in theme declaring the opt-in
      token).

## 4. Verification

- [x] 4.1 `npx vitest run tests/unit/css/themes.test.ts tests/unit/components/campaign-themes.test.ts`
      — was 55 passing before this change; must still be green with the added assertions. The count
      drops to 48 rather than rising: the per-theme `it()` per token becomes one `it()` per theme per
      CSS file, so assertions go from 4 to 14 per theme while the test count falls. Fewer test names,
      strictly more checked.
- [x] 4.2 `npx vitest run tests/unit/` — the CI command from `.github/workflows/deploy.yml`.
- [x] 4.3 `npx eslint` and `npx prettier --check` on every touched file. `npm run build` was **not**
      run and is not needed here: the only non-spec files this change touches are two files under
      `tests/`, which the Nuxt build does not compile, and `@nuxt/fonts` resolves theme fonts from
      `themes.css` and `app/utils/themes.ts` — neither of which is modified. A dev server was also
      live on port 3333, and `nuxt build` writes `.nuxt/`, so running it would have disturbed a
      running server to re-prove an input that did not change.
- [x] 4.4 `openspec validate theme-registry-single-source --strict` — must pass.
- [x] 4.5 `openspec validate --all --strict` — the **38** pre-existing failures recorded when this
      change was authored are **gone**: the separately-owned spec-hygiene work landed in `75d2c23`,
      which repaired the merged-spec shape across `openspec/specs` and unhid 179 requirements. The
      bar is therefore stricter than authored — **81 passed, 0 failed** before this change, and it
      must still be 0 failed after. This change must add none.
- [x] 4.6 No E2E run needed: `tests/e2e/campaign-themes.spec.ts` covers behaviour that does not
      change.
- [x] 4.7 aleph-cli: nothing to do, and confirm so. Correcting the reason this task and the proposal
      originally gave — "the CLI has no theme command" is **false**. `aleph campaign create` takes
      `--theme <theme>` (`cli/src/commands/campaign.js:35`) and `campaign show` prints
      `data.theme || 'default'` (line 64). The conclusion survives the correction: the option is an
      unvalidated pass-through to `POST /api/campaigns`, the CLI holds no enumeration of theme slugs
      (`grep -rn 'CAMPAIGN_THEMES\|dark-fantasy' cli/` finds only two illustrative slugs in the
      option's own help string), and the display fallback matches the unchanged
      `Theme stored per campaign` requirement. No endpoint, auth flow, or data-model change here, so
      `cli/`, `docs/claude-skill.md`, and `.claude/skills/aleph-cli/SKILL.md` need no update and no
      skill version bump.
- [x] 4.8 Archive with `openspec archive theme-registry-single-source` **only after** groups 1–3
      land. Leaving it active with unticked tasks is correct until then. Archived per this repo's
      `/opsx:archive` step 5 (a folder move; the delta→main-spec merge is the agent-driven step 4,
      verified against the `9bde8c3` guard before the move).
