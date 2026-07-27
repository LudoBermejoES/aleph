## MODIFIED Requirements

### Requirement: Theme typography tokens

Each `[data-theme]` block SHALL define `--theme-font-heading`, `--theme-font-body`, `--theme-font-weight-heading`, `--theme-letter-spacing`, and `--theme-text-transform` CSS custom properties with values appropriate to the genre. This SHALL hold for every theme in the `CAMPAIGN_THEMES` registry (`app/utils/themes.ts`) except `default`, which is defined by the absence of a `data-theme` attribute and has no theme block. The registry — not a count or a list written into this specification — determines which themes the rule applies to.

#### Scenario: Heading font applied in dark-fantasy theme

- **GIVEN** a campaign whose theme is `dark-fantasy`
- **WHEN** that campaign is active and a page contains an `<h1>` element
- **THEN** the computed font-family of that heading includes "Cinzel Decorative"

#### Scenario: Body font applied in cyberpunk theme

- **GIVEN** a campaign whose theme is `cyberpunk`
- **WHEN** that campaign is active
- **THEN** body text and paragraphs render in "Share Tech Mono"

#### Scenario: Default theme is unaffected

- **GIVEN** a page rendered outside any themed campaign
- **WHEN** no `data-theme` attribute is present on the root element
- **THEN** headings and body text use the default Tailwind/shadcn font stack (no theme font applied)

#### Scenario: Every registry theme defines every typography token

- **GIVEN** the set of theme `id` values in `CAMPAIGN_THEMES`, excluding `default`
- **WHEN** `app/assets/css/themes.css` is inspected for the `[data-theme='<id>']` token block of each one
- **THEN** every such block contains non-empty values for `--theme-font-heading`, `--theme-font-body`, `--theme-font-weight-heading`, `--theme-letter-spacing`, and `--theme-text-transform`
- **AND** the check covers whatever the registry currently holds, so it cannot be invalidated by adding a theme

### Requirement: Google Fonts loaded on demand via @nuxt/fonts

The system SHALL use `@nuxt/fonts` to detect font-family references in CSS custom properties and load only the fonts required by the active theme, self-hosting them in the build output. Self-hosting SHALL cover the heading and body fonts of every theme in the `CAMPAIGN_THEMES` registry, without this specification restating how many themes there are.

#### Scenario: Font files are self-hosted (no Google CDN calls)

- **GIVEN** the `--theme-font-heading` and `--theme-font-body` values of every theme in `CAMPAIGN_THEMES` except `default`
- **WHEN** the application is built
- **THEN** font files for all of those heading and body fonts are present in the build output directory
- **AND** no runtime requests are made to `fonts.googleapis.com`

#### Scenario: Unused theme fonts are not loaded at runtime

- **GIVEN** a campaign whose theme is `cyberpunk`
- **WHEN** that theme is active
- **THEN** the browser does not request font files for `dark-fantasy`, `high-fantasy`, or any other theme's fonts

## ADDED Requirements

### Requirement: Theme token parity is enforced against the registry

Every theme in `CAMPAIGN_THEMES` other than `default` MUST have a `[data-theme='<id>']` token block in `app/assets/css/themes.css` defining the complete decoration and typography token set that this capability declares mandatory — `--theme-font-heading`, `--theme-font-body`, `--theme-font-weight-heading`, `--theme-letter-spacing`, `--theme-text-transform`, `--theme-bg-pattern`, `--theme-card-shadow`, `--theme-card-border`, and `--theme-heading-decoration` — and this parity MUST be enforced by an automated test that derives its theme list from `CAMPAIGN_THEMES` by import, never from a hardcoded array. Adding a theme without its token block, or with an incomplete one, MUST fail CI rather than fail review.

`--theme-heading-color` is deliberately **not** in that mandatory set. It is an **opt-in** token, declared only by a theme that colours its own headings; for every theme that omits it the wiring rule falls back to `inherit` and the mechanism stays inert. The parity gate SHALL NOT require it of any theme. The gate SHALL instead enforce the opt-in property in both directions: a theme in the gate's opt-in set MUST declare it with the expected value, and every other registry theme MUST NOT declare it at all, so heading colouring cannot leak into a theme unnoticed. That opt-in set is an explicit allowlist of the themes that colour their headings — it is not a mirror of the catalogue, adding a theme requires no edit to it, and opting a theme in is the deliberate acknowledgement the allowlist exists to capture.

#### Scenario: A theme with no themes.css token block fails CI

- **GIVEN** a developer adds a new entry to `CAMPAIGN_THEMES`
- **WHEN** they do not add a matching `[data-theme='<id>']` token block to `app/assets/css/themes.css`
- **AND** the unit test suite runs in CI
- **THEN** the test fails and names the theme whose block is missing

#### Scenario: A theme missing a single mandatory token fails CI

- **GIVEN** a theme in `CAMPAIGN_THEMES` whose `themes.css` block omits `--theme-letter-spacing`, `--theme-text-transform`, `--theme-font-weight-heading`, `--theme-card-shadow`, or `--theme-card-border`
- **WHEN** the unit test suite runs
- **THEN** the test fails and names both the theme and the missing token
- **AND** a partially-filled block is not accepted merely because `--theme-font-heading` and `--theme-font-body` are present

#### Scenario: An opt-in token is not required of every theme

- **GIVEN** a theme in `CAMPAIGN_THEMES` that is not in the gate's `--theme-heading-color` opt-in set
- **WHEN** its `themes.css` block declares all nine mandatory tokens and omits `--theme-heading-color`
- **THEN** the parity test passes for that theme
- **AND** it fails only if that theme declares `--theme-heading-color` without being opted in, naming the theme and telling the developer to add it to the opt-in set if the colour is intentional

#### Scenario: An opted-in theme must keep declaring its heading colour

- **GIVEN** a theme listed in the gate's `--theme-heading-color` opt-in set
- **WHEN** its `themes.css` block no longer declares `--theme-heading-color`, or declares it with a different value
- **THEN** the parity test fails and names that theme

#### Scenario: The enforcement test holds no list of its own

- **GIVEN** the parity test in `tests/unit/css/`
- **WHEN** its source is inspected
- **THEN** the themes it iterates are obtained from `CAMPAIGN_THEMES` by import
- **AND** it contains no literal array reproducing the theme catalogue that a developer would have to update by hand when a theme is added
- **AND** the only literal theme names it holds are the opt-in allowlist for optional tokens, which a catalogue addition never obliges anyone to touch
