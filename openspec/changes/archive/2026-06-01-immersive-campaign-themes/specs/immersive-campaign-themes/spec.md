## ADDED Requirements

### Requirement: Theme typography tokens

Each `[data-theme]` block SHALL define `--theme-font-heading`, `--theme-font-body`, `--theme-font-weight-heading`, `--theme-letter-spacing`, and `--theme-text-transform` CSS custom properties with values appropriate to the genre.

#### Scenario: Heading font applied in dark-fantasy theme

- **WHEN** a campaign with theme `dark-fantasy` is active and a page contains an `<h1>` element
- **THEN** the computed font-family of that heading includes "Cinzel Decorative"

#### Scenario: Body font applied in cyberpunk theme

- **WHEN** a campaign with theme `cyberpunk` is active
- **THEN** body text and paragraphs render in "Share Tech Mono"

#### Scenario: Default theme is unaffected

- **WHEN** no `data-theme` attribute is present on the root element
- **THEN** headings and body text use the default Tailwind/shadcn font stack (no theme font applied)

#### Scenario: All 10 themes define all 6 typography tokens

- **WHEN** the CSS is inspected for each of the 10 `data-theme` values
- **THEN** every theme block contains non-empty values for `--theme-font-heading`, `--theme-font-body`, `--theme-font-weight-heading`, `--theme-letter-spacing`, and `--theme-text-transform`

---

### Requirement: Google Fonts loaded on demand via @nuxt/fonts

The system SHALL use `@nuxt/fonts` to detect font-family references in CSS custom properties and load only the fonts required by the active theme, self-hosting them in the build output.

#### Scenario: Font files are self-hosted (no Google CDN calls)

- **WHEN** the application is built
- **THEN** font files for all 10 theme heading and body fonts are present in the build output directory and no runtime requests are made to `fonts.googleapis.com`

#### Scenario: Unused theme fonts are not loaded at runtime

- **WHEN** the active theme is `cyberpunk`
- **THEN** the browser does not request font files for `dark-fantasy`, `high-fantasy`, or any other theme's fonts

---

### Requirement: SVG background texture per theme

Each `[data-theme]` block SHALL define `--theme-bg-pattern` as a CSS `url("data:image/svg+xml,...")` or `repeating-gradient(...)` value. The main content area SHALL apply this pattern at low opacity so it is visible but does not impair readability.

#### Scenario: Background texture visible in dark-fantasy

- **WHEN** a campaign with theme `dark-fantasy` is active
- **THEN** the main content area displays a subtle repeating stone/cobble texture that does not obscure text

#### Scenario: Background pattern is CSS-only (no image files)

- **WHEN** the network tab is inspected while a themed campaign is open
- **THEN** no `.png`, `.jpg`, `.gif`, or `.webp` image requests are made for background textures

#### Scenario: Default theme has no background pattern

- **WHEN** no `data-theme` attribute is set
- **THEN** the main content area has no background-image applied

---

### Requirement: Card and heading decoration tokens

Each `[data-theme]` block SHALL define `--theme-card-shadow`, `--theme-card-border`, and `--theme-heading-decoration`. Global CSS rules SHALL apply these tokens to card components (matched via the `[data-slot='card']` attribute on the shadcn-vue Card root) and `h2::before` pseudo-elements respectively.

#### Scenario: Card shadow applied in steampunk theme

- **WHEN** a campaign with theme `steampunk` is active and a card component is rendered
- **THEN** the card displays a warm amber glow box-shadow

#### Scenario: Heading ornament rendered in high-fantasy theme

- **WHEN** a campaign with theme `high-fantasy` is active and an `<h2>` is rendered
- **THEN** the `::before` pseudo-element of the heading displays the decorative character defined by `--theme-heading-decoration`

#### Scenario: Cards have no unexpected decoration in default theme

- **WHEN** no `data-theme` is set
- **THEN** `.card` elements have no theme-specific box-shadow or border-image applied

---

### Requirement: Theme micro-animations with motion safety

Six `@keyframes` animations (theme-glitch, theme-flicker, theme-shimmer, theme-float, theme-static, theme-decay) SHALL be defined. Each theme that uses animation SHALL apply its animation only inside `@media (prefers-reduced-motion: no-preference)`. Under `prefers-reduced-motion: reduce`, no animation SHALL play.

#### Scenario: Glitch animation plays in cyberpunk theme

- **WHEN** a campaign with theme `cyberpunk` is active AND the user has not set `prefers-reduced-motion`
- **THEN** `<h1>` elements display the theme-glitch clip-path animation

#### Scenario: Animations disabled when user requests reduced motion

- **WHEN** the operating system or browser has `prefers-reduced-motion: reduce` set AND any themed campaign is active
- **THEN** no CSS animation plays on any element regardless of theme

#### Scenario: Non-animated themes are unaffected

- **WHEN** a campaign with theme `western` is active (no animation defined)
- **THEN** `--theme-animation` is `none` and no keyframe plays

---

### Requirement: themes.css file isolates all new theme declarations

All new CSS custom-property token declarations and global wiring rules SHALL reside in `app/assets/css/themes.css`, imported from `main.css`. The existing colour-token blocks in `main.css` SHALL remain unchanged.

#### Scenario: Existing colour tokens are preserved

- **WHEN** the CSS for `[data-theme='dark-fantasy']` is inspected after the change
- **THEN** all original colour tokens (`--background`, `--foreground`, `--primary`, etc.) are still present and have the same values

#### Scenario: themes.css is importable standalone

- **WHEN** `themes.css` is linted
- **THEN** it contains no references to variables defined only in `main.css` (it is self-contained for the new tokens)

---

### Requirement: Theme reaches Teleport-portalled components

The active theme SHALL be applied to the document root (`<html>`) so that components rendered via Vue `<Teleport>` to `<body>` — dialogs, dropdown menus, popovers, tooltips, and the command palette — inherit theme typography and decoration. The attribute SHALL be removed when no campaign theme is active.

#### Scenario: Dialog content uses theme font

- **WHEN** a campaign with theme `cyberpunk` is active AND a dialog (or the Ctrl+K search palette) is open
- **THEN** the portalled content rendered under `<body>` has its heading/body `font-family` resolved to the cyberpunk theme fonts, matching the main content area

#### Scenario: Theme attribute cleared outside a campaign

- **WHEN** the user navigates away from any campaign (no active campaign theme)
- **THEN** the `data-theme` attribute is absent from both the layout root and `<html>`, and portalled components use the default font stack
