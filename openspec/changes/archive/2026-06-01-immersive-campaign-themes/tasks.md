## 1. Setup

- [x] 1.1 Install `@nuxt/fonts` module: `npm install @nuxt/fonts` and add `'@nuxt/fonts'` to `modules` array in `nuxt.config.ts`
- [x] 1.2 Create `app/assets/css/themes.css` (empty file)
- [x] 1.3 Add `@import './themes.css';` as the last line of `app/assets/css/main.css`
- [x] 1.4 Add `data-slot="card"` to the root `<div>` of `app/components/ui/card/Card.vue` (the card-decoration rule has no existing class/attribute to target)
- [x] 1.5 In `app/layouts/default.vue`, mirror the active theme onto the document root: add a client-side `watchEffect` that sets/removes `data-theme` on `document.documentElement` from `campaignTheme`, so Teleport-portalled UI (dialogs, dropdowns, popovers, `SearchCommand`) inherits theme fonts/decoration (the layout `div` binding stays)

## 2. Global wiring rules in themes.css

- [x] 2.1 Write the global typography consumer rules: `[data-theme] h1/h2/h3` consume `--theme-font-heading`, `--theme-font-weight-heading`, `--theme-letter-spacing`, `--theme-text-transform`, `--theme-animation`
- [x] 2.2 Write global body font rule: `[data-theme] body, [data-theme] p` consume `--theme-font-body`
- [x] 2.3 Write mono font rule: `[data-theme] code, [data-theme] pre` consume `--theme-font-mono`
- [x] 2.4 Write card decoration rule: `[data-theme] [data-slot='card']` consumes `--theme-card-shadow` and `--theme-card-border` (the `data-slot` attribute added in task 1.4)
- [x] 2.5 Write heading ornament rule: `[data-theme] h2::before { content: var(--theme-heading-decoration, ''); margin-right: 0.4em; }`
- [x] 2.6 Write the background-pattern rule against the real markup: `[data-theme] main { background-image: var(--theme-bg-pattern, none); }` (the layout's content area is a bare `<main>` at `default.vue:61` — there is no `.layout-main`)

## 3. Keyframe animations

- [x] 3.1 Write `@keyframes theme-glitch` — two pseudo-elements with `clip-path` rectangle slices + `transform: skewX(±2deg)` + `opacity` toggling rapidly (cyberpunk)
- [x] 3.2 Write `@keyframes theme-flicker` — `opacity` oscillates 0.99 → 0.4 → 0.99 with irregular steps + `text-shadow` colour shift (dark-fantasy candle)
- [x] 3.3 Write `@keyframes theme-shimmer` — `background-position` sweeps a gold `linear-gradient` left→right across a `::after` pseudo-element (high-fantasy)
- [x] 3.4 Write `@keyframes theme-float` — `transform: translateY(0) → translateY(-5px) → translateY(0)` with `ease-in-out` 3s infinite (fey-wilds)
- [x] 3.5 Write `@keyframes theme-static` — `filter: hue-rotate(0deg) contrast(1) → hue-rotate(360deg) contrast(1.1)` cycling fast (eldritch)
- [x] 3.6 Write `@keyframes theme-decay` — `opacity: 1 → 0.65 → 1` 4s ease-in-out infinite (undead)
- [x] 3.7 Wrap all animation applications in `@media (prefers-reduced-motion: no-preference) { … }` blocks

## 4. SVG background patterns (--theme-bg-pattern)

- [x] 4.1 **dark-fantasy**: `repeating-radial-gradient` cobblestone — two overlapping radial gradients at offset positions creating a stone texture at ~4% opacity
- [x] 4.2 **cyberpunk**: inline SVG data URI — 20×20px grid of thin lines with L-shaped circuit traces in `hsl(180 100% 50% / 0.06)` on transparent
- [x] 4.3 **cosmic-horror**: `radial-gradient` dot matrix — tiny 1px dots on 24px grid simulating a star field at 6% opacity
- [x] 4.4 **high-fantasy**: inline SVG — 20×20px diagonal cross-hatch (two sets of lines at 45°/135°) at 4% opacity, gold tint
- [x] 4.5 **western**: inline SVG — 6px-wide diagonal stripes simulating wood grain at 5% opacity, amber tint
- [x] 4.6 **steampunk**: inline SVG — hexagonal grid (path-based hexagons) at 5% opacity, brass tint
- [x] 4.7 **eldritch**: inline SVG — sine-wave warped grid lines using `<path>` quadratic bezier curves at 5% opacity, sickly green tint
- [x] 4.8 **fey-wilds**: inline SVG — repeating 4-petal flower motif (4 ellipses rotated 90°) at 5% opacity, pink/lavender tint
- [x] 4.9 **undead**: inline SVG — repeating small X/cross bone motif at 4% opacity, desaturated grey-green tint
- [x] 4.10 **superhero**: `radial-gradient` halftone — 4px circles on 8px grid (Ben-Day dots) at 5% opacity, primary colour tint

## 5. Typography tokens per theme

Write the following token blocks inside `themes.css` for each theme (add to or after the matching colour block, under the same `[data-theme='X']` selector):

- [x] 5.1 **dark-fantasy**: `--theme-font-heading: 'Cinzel Decorative', serif; --theme-font-body: 'IM Fell English', serif; --theme-font-weight-heading: 700; --theme-letter-spacing: 0.08em; --theme-text-transform: uppercase;`
- [x] 5.2 **cyberpunk**: `--theme-font-heading: 'Orbitron', sans-serif; --theme-font-body: 'Share Tech Mono', monospace; --theme-font-mono: 'Share Tech Mono', monospace; --theme-font-weight-heading: 900; --theme-letter-spacing: 0.12em; --theme-text-transform: uppercase;`
- [x] 5.3 **cosmic-horror**: `--theme-font-heading: 'Uncial Antiqua', serif; --theme-font-body: 'Crimson Text', serif; --theme-font-weight-heading: 400; --theme-letter-spacing: 0.04em; --theme-text-transform: none;`
- [x] 5.4 **high-fantasy**: `--theme-font-heading: 'Cinzel', serif; --theme-font-body: 'Lora', serif; --theme-font-weight-heading: 700; --theme-letter-spacing: 0.06em; --theme-text-transform: none;`
- [x] 5.5 **western**: `--theme-font-heading: 'Rye', serif; --theme-font-body: 'Playfair Display', serif; --theme-font-weight-heading: 400; --theme-letter-spacing: 0.03em; --theme-text-transform: none;`
- [x] 5.6 **steampunk**: `--theme-font-heading: 'Special Elite', cursive; --theme-font-body: 'Libre Baskerville', serif; --theme-font-weight-heading: 400; --theme-letter-spacing: 0.05em; --theme-text-transform: none;`
- [x] 5.7 **eldritch**: `--theme-font-heading: 'Trade Winds', serif; --theme-font-body: 'IM Fell DW Pica', serif; --theme-font-weight-heading: 400; --theme-letter-spacing: 0.06em; --theme-text-transform: none;`
- [x] 5.8 **fey-wilds**: `--theme-font-heading: 'Pacifico', cursive; --theme-font-body: 'Nunito', sans-serif; --theme-font-weight-heading: 400; --theme-letter-spacing: 0.02em; --theme-text-transform: none;`
- [x] 5.9 **undead**: `--theme-font-heading: 'UnifrakturMaguntia', cursive; --theme-font-body: 'Spectral', serif; --theme-font-weight-heading: 400; --theme-letter-spacing: 0.04em; --theme-text-transform: none;`
- [x] 5.10 **superhero**: `--theme-font-heading: 'Bangers', cursive; --theme-font-body: 'Exo 2', sans-serif; --theme-font-weight-heading: 400; --theme-letter-spacing: 0.1em; --theme-text-transform: uppercase;`

## 6. Decoration tokens per theme

Add `--theme-card-shadow`, `--theme-card-border`, `--theme-heading-decoration`, and `--theme-animation` to each theme block in `themes.css`:

- [x] 6.1 **dark-fantasy**: card shadow red glow + double border; heading decoration `'⚔'`; animation `theme-flicker 3s steps(8, end) infinite`
- [x] 6.2 **cyberpunk**: card shadow cyan neon glow + 1px solid cyan border; heading decoration `'//  '`; animation `theme-glitch 4s linear infinite`
- [x] 6.3 **cosmic-horror**: card shadow green outer glow + dashed border; heading decoration `'✦'`; animation `none`
- [x] 6.4 **high-fantasy**: card shadow gold inset + `border-image: linear-gradient(var(--primary), var(--accent)) 1`; heading decoration `'✦ '`; animation `theme-shimmer 2.5s ease-in-out infinite`
- [x] 6.5 **western**: card shadow sepia drop-shadow + ridge border; heading decoration `'★  '`; animation `none`
- [x] 6.6 **steampunk**: card shadow warm amber glow + double border; heading decoration `'⚙ '`; animation `none`
- [x] 6.7 **eldritch**: card shadow sickly green outer glow + groove border; heading decoration `'꩜ '`; animation `theme-static 0.5s steps(4) infinite`
- [x] 6.8 **fey-wilds**: card shadow pink soft glow + dashed pastel border; heading decoration `'✿ '`; animation `theme-float 3s ease-in-out infinite`
- [x] 6.9 **undead**: card shadow cold grey inset + solid muted border; heading decoration `'✝ '`; animation `theme-decay 4s ease-in-out infinite`
- [x] 6.10 **superhero**: card shadow yellow hard offset + solid bold border; heading decoration `'★ '`; animation `none`

## 7. Visual verification

- [x] 7.1 Start dev server and manually cycle through all 10 themes in a campaign; verify font, texture, decoration, and animation for each
- [x] 7.2 Test in a browser with `prefers-reduced-motion: reduce` forced via DevTools; confirm all animations are absent
- [x] 7.3 Verify the default (no theme) campaign page is visually unchanged
- [x] 7.4 Check that card components (`[data-slot=card]`) show correct shadow/border per theme in the campaign dashboard
- [x] 7.5 Open a dialog / dropdown / the Ctrl+K search palette in a themed campaign and confirm the portalled content uses the theme heading/body font (verifies the `<html>` `data-theme` mirroring from task 1.5)
- [x] 7.6 Inspect the network tab on a themed campaign: confirm only the active theme's font files are requested (not all 10 themes' fonts) and note total added font weight; confirm `font-display: swap` so text is visible during load
- [x] 7.7 Run `npx nuxi typecheck` — zero errors

## 8. Tests

- [x] 8.1 Write/update E2E test `tests/e2e/campaign-themes.spec.ts`: screenshot each theme's campaign dashboard, assert heading font-family via `page.evaluate()`
- [x] 8.2 Write unit test asserting `--theme-font-heading` is non-empty for each of the 10 themes by parsing `themes.css`
- [x] 8.3 Write E2E test asserting animation is absent when `prefers-reduced-motion: reduce` is set via `page.emulateMedia({ reducedMotion: 'reduce' })`
- [x] 8.4 Write E2E test: in a themed campaign, open a Teleport-portalled surface (dialog or the `SearchCommand` palette) and assert via `page.evaluate()` that its computed heading/body `font-family` matches the active theme — guards the `<html>` `data-theme` mirroring (task 1.5)
