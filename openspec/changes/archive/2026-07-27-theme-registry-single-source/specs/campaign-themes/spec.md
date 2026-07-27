## MODIFIED Requirements

### Requirement: Built-in RPG themes

The system SHALL provide at least 10 built-in visual themes optimized for different TTRPG settings. Each theme SHALL define the full set of CSS color tokens (`--background`, `--foreground`, `--primary`, `--muted`, `--accent`, `--border`, `--sidebar-background`, etc.) as overrides applied via a `data-theme` attribute on the campaign layout wrapper.

The registry of record for which themes exist is `app/utils/themes.ts` (`CAMPAIGN_THEMES`). That module — not this document — defines the catalogue: its `id` values are the valid `data-theme` slugs and the valid `campaigns.theme` values, and its `name` and swatch colours are what the theme picker renders. `at least 10` above is the only normative statement this requirement makes about the count.

The following list is **illustrative and non-normative**. It records the design intent behind each theme for readers of this spec; it is not exhaustive, it does not constrain the catalogue, and it may lag `app/utils/themes.ts`. Adding a theme to the registry does not violate this requirement, and no gate reads this list. It is complete and correct as of this change, at twelve entries:

- `default` — neutral light theme (current design); rendered by the **absence** of a `data-theme` attribute rather than by a theme block
- `dark-fantasy` — dark backgrounds, blood-red accents, parchment text
- `cyberpunk` — near-black backgrounds, neon cyan/magenta accents
- `cosmic-horror` — deep purple/black, sickly green accents, desaturated text
- `high-fantasy` — warm ivory backgrounds, gold and deep blue accents
- `western` — sepia/tan backgrounds, terracotta and brown accents
- `steampunk` — dark bronze backgrounds, amber/copper accents
- `eldritch` — dark teal backgrounds, pale yellow accents
- `fey-wilds` — soft lavender backgrounds, pink/green accents
- `undead` — near-black with bone-white text, grey-green accents
- `superhero` — deep navy backgrounds, gold and comic-red accents
- `mage-ascension` — dark violet backgrounds, arcane purple and gold accents

#### Scenario: Theme tokens cover all UI elements

- **GIVEN** a campaign with any built-in theme applied
- **WHEN** a user views any campaign page (entities, characters, sessions, etc.)
- **THEN** all UI elements (backgrounds, text, borders, sidebar, buttons, cards) render using the theme's tokens with no unstyled fallback to the default theme

#### Scenario: The registry is authoritative over this document

- **GIVEN** `app/utils/themes.ts` exports a `CAMPAIGN_THEMES` entry that the illustrative list above does not mention
- **WHEN** that theme's `id` is used as a `data-theme` slug and as a `campaigns.theme` value
- **THEN** it is treated as a valid built-in theme in every respect — selectable in the picker, applied by the layout, and subject to the CSS parity checks below
- **AND** no requirement in this specification is considered violated by its absence from the list

#### Scenario: The catalogue may grow without a spec change

- **GIVEN** the registry holds at least 10 themes
- **WHEN** a new theme is added to `CAMPAIGN_THEMES`
- **THEN** the `at least 10` floor still holds and this requirement needs no edit
- **AND** the only thing that can fail is the registry-derived CSS parity gate, if the new theme's token blocks are missing

## ADDED Requirements

### Requirement: Theme registry is the single source of truth

Every theme in `CAMPAIGN_THEMES` other than `default` MUST have a colour-token block in `app/assets/css/main.css`, and this parity MUST be enforced by an automated test that derives its list of themes from `CAMPAIGN_THEMES` by import rather than from a hardcoded array. Adding a theme to the registry without its colour-token block MUST fail CI (`npx vitest run tests/unit/`, per `.github/workflows/deploy.yml`) rather than depend on review to catch it. No test, and no other module, SHALL maintain a second hand-written enumeration of theme slugs for this purpose.

`default` is excluded because it is defined by the absence of a `data-theme` attribute and intentionally has no theme block.

#### Scenario: A theme with no colour-token block fails CI

- **GIVEN** a developer adds a new entry to `CAMPAIGN_THEMES` in `app/utils/themes.ts`
- **WHEN** they do not add a matching `[data-theme='<id>']` colour-token block to `app/assets/css/main.css`
- **AND** the unit test suite runs in CI
- **THEN** the parity test fails and names the theme whose block is missing
- **AND** the failure occurs without anyone having edited a list of theme names

#### Scenario: Parity test tracks the registry automatically

- **GIVEN** a theme is added to `CAMPAIGN_THEMES` together with its `main.css` colour-token block
- **WHEN** the unit test suite runs
- **THEN** the new theme is checked automatically, with no edit to the test's own list of themes
- **AND** the suite passes

#### Scenario: The default theme is exempt from block parity

- **GIVEN** `default` is present in `CAMPAIGN_THEMES`
- **WHEN** the parity test runs
- **THEN** `default` is skipped and its lack of a `[data-theme='default']` block is not reported as a failure
