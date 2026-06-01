## Context

The existing theme system binds a `data-theme` attribute to the root layout `div` (`app/layouts/default.vue:2`, `:data-theme="campaignTheme || undefined"`, reactive via the `campaignTheme` useState) and overrides ~30 shadcn CSS custom-property colour tokens per theme in `main.css`. The app is a Nuxt 4 SPA on **Tailwind v3** (`@nuxtjs/tailwindcss` → `tailwindcss@3.4.x`; `main.css` opens with `@tailwind base/components/utilities`, **not** the v4 `@import "tailwindcss"` / `@theme` model). This is irrelevant to the implementation — all theme tokens are plain CSS custom properties declared under `[data-theme]` attribute selectors, which behave identically in v3 and v4; **do not** attempt to register them via `@theme`. `@nuxt/fonts` is not yet installed. All 10 themes live in `app/assets/css/main.css` between lines 124–437.

Real-world references confirm the approach: Foundry VTT's Fantasy RPG UI module uses `border-image` + CSS variables on a shadcn-like component stack; World Anvil's Eldritch Horror theme uses CSS-only decoration; Roll20 uses `data-attribute` theming with variable overrides.

## Goals / Non-Goals

**Goals:**

- Each theme produces a visually distinct world: font personality, texture, decorative chrome, and optional animation.
- Zero new binary assets — every texture is an inline SVG data URI or a CSS gradient.
- Accessible: `prefers-reduced-motion` disables all animations; contrast is already guaranteed by the existing colour tokens.
- No component rewrites — pure CSS, attribute selectors, and global heading/card rules only.
- `main.css` stays lean; all new theme CSS lives in a dedicated `themes.css`.

**Non-Goals:**

- Per-entity or per-page theming (only campaign-level `data-theme` is in scope).
- Animated backgrounds or particle effects.
- IE11 / legacy browser support.

## Decisions

### 1. Separate `themes.css`, imported from `main.css`

All new token declarations and global wiring rules go in `app/assets/css/themes.css`. The existing colour tokens in `main.css` remain untouched. `main.css` adds one line: `@import './themes.css';`. This prevents the file exceeding a maintainable size and makes diffing theme changes trivial.

### 2. `@nuxt/fonts` for Google Fonts (preferred over `useHead`)

`@nuxt/fonts` auto-detects font-family values referenced in CSS custom properties with zero configuration — no `useHead` composable, no `nuxt.config.ts` per-font entries. It bundles and self-hosts fonts automatically, eliminating the Google Fonts CDN dependency. **Alternative rejected:** `useHead` with reactive `link` tags requires a composable watching `campaign.theme` and injecting `<link>` tags — more code, runtime CDN dependency, FOUC risk.

### 3. 11 new custom-property tokens per theme

```
--theme-font-heading        font-family for h1/h2/h3
--theme-font-body           font-family for body/p
--theme-font-mono           font-family for code/pre (cyberpunk only; others inherit)
--theme-font-weight-heading font-weight on headings
--theme-letter-spacing      letter-spacing on headings
--theme-text-transform      text-transform on headings
--theme-card-shadow         box-shadow on card components ([data-slot=card])
--theme-card-border         border shorthand or border-image on cards
--theme-heading-decoration  content value for h2::before pseudo-element ornament
--theme-bg-pattern          SVG data-URI for background-image on main content area
--theme-animation           animation shorthand applied to h1 (none by default in default theme)
```

Tokens without a theme override fall back to the default Tailwind/shadcn values, so the default (no `data-theme`) appearance is unchanged.

### 4. Global wiring rules in `themes.css`

A single block of rules consumes the tokens. Selectors are matched against the **real markup** (verified against the codebase), not assumed class names:

- Headings are raw `<h1>/<h2>/<h3>` on every page (e.g. `index.vue`, `campaigns/[id]/index.vue`, character pages) **and** in MDC-rendered wiki content — all nested under the `[data-theme]` root, so a descendant selector reaches both.
- The card component (`app/components/ui/card/Card.vue`) renders `bg-card text-card-foreground` Tailwind classes with **no `.card` class**; we add `data-slot="card"` to its root and target that.
- The main content area is a bare `<main class="flex-1 overflow-auto …">` (`default.vue:61`) with no class hook — target the element directly with `[data-theme] main`. There is no `.layout-main`.

```css
[data-theme] h1,
[data-theme] h2,
[data-theme] h3 {
  font-family: var(--theme-font-heading, inherit);
  font-weight: var(--theme-font-weight-heading, inherit);
  letter-spacing: var(--theme-letter-spacing, inherit);
  text-transform: var(--theme-text-transform, none);
  animation: var(--theme-animation, none);
}
[data-theme] body,
[data-theme] p {
  font-family: var(--theme-font-body, inherit);
}
[data-theme] code,
[data-theme] pre {
  font-family: var(--theme-font-mono, monospace);
}
[data-theme] [data-slot='card'] {
  box-shadow: var(--theme-card-shadow, none);
  border: var(--theme-card-border, none);
}
[data-theme] h2::before {
  content: var(--theme-heading-decoration, '');
  margin-right: 0.4em;
}
[data-theme] main {
  background-image: var(--theme-bg-pattern, none);
}
```

### 4a. Teleported components inherit the theme via `<html>`

shadcn-vue dialogs, dropdown menus, popovers, tooltips, and the `SearchCommand` palette render through Vue `<Teleport>` to `<body>` — **outside** the `[data-theme]` layout `div`. The existing colour tokens survive only because shadcn classes like `bg-popover` resolve against variables that are _also_ defined on `:root`/`.dark`; the new theme tokens are defined **only** under `[data-theme='…']`, so portalled content would get no theme font/decoration.

Fix: in `default.vue`, mirror the active theme onto the document root so the attribute selector also matches portalled nodes:

```ts
watchEffect(() => {
  if (import.meta.client) {
    const html = document.documentElement
    if (campaignTheme.value) html.setAttribute('data-theme', campaignTheme.value)
    else html.removeAttribute('data-theme')
  }
})
```

The existing `:data-theme` binding on the layout `div` stays (it is harmless and keeps non-portalled scoping intact). With the attribute on `<html>`, `[data-theme] …` selectors reach both the main tree and every Teleport target under `<body>`.

### 4b. MDC `.prose` does not override body font

`main.css` `.prose` block (lines 73–122) sets only colour variables and `color:` — it does **not** declare `font-family`. Therefore `[data-theme] body, [data-theme] p { font-family: var(--theme-font-body) }` is not overridden inside markdown content; wiki text adopts the theme body font as intended. No `.prose` change is required. (If a future Tailwind Typography upgrade adds a `.prose` font-family, add `[data-theme] .prose { font-family: var(--theme-font-body, inherit) }`.)

### 5. Font assignments per theme

| Theme         | Heading font       | Body font         |
| ------------- | ------------------ | ----------------- |
| dark-fantasy  | Cinzel Decorative  | IM Fell English   |
| cyberpunk     | Orbitron           | Share Tech Mono   |
| cosmic-horror | Uncial Antiqua     | Crimson Text      |
| high-fantasy  | Cinzel             | Lora              |
| western       | Rye                | Playfair Display  |
| steampunk     | Special Elite      | Libre Baskerville |
| eldritch      | Trade Winds        | IM Fell DW Pica   |
| fey-wilds     | Pacifico           | Nunito            |
| undead        | UnifrakturMaguntia | Spectral          |
| superhero     | Bangers            | Exo 2             |

All are available on Google Fonts and auto-detected by `@nuxt/fonts`.

### 6. SVG background patterns — inline data URIs at low opacity

Each `--theme-bg-pattern` is an `url("data:image/svg+xml,...")` value. Patterns are applied at `opacity: 0.04–0.08` by embedding opacity in the SVG `fill` or by setting `background-blend-mode: overlay`. Specific patterns:

| Theme         | Pattern technique                                 |
| ------------- | ------------------------------------------------- |
| dark-fantasy  | `repeating-radial-gradient` stone/cobble          |
| cyberpunk     | Inline SVG grid + L-shaped circuit lines          |
| cosmic-horror | `radial-gradient` dot matrix star field           |
| high-fantasy  | SVG diagonal cross-hatch (illuminated manuscript) |
| western       | SVG diagonal wood-grain lines                     |
| steampunk     | SVG hex grid                                      |
| eldritch      | SVG warped sine-wave grid                         |
| fey-wilds     | SVG small 4-petal flower repeat                   |
| undead        | SVG small bone/X motif                            |
| superhero     | `radial-gradient` halftone Ben-Day dots           |

### 7. Keyframe animations — opt-in, motion-safe only

Six `@keyframes` blocks defined once; themes reference them by name via `--theme-animation`. All are wrapped:

```css
@media (prefers-reduced-motion: no-preference) {
  [data-theme='cyberpunk'] h1 {
    animation: var(--theme-animation);
  }
  /* etc. */
}
```

| Keyframe        | Theme        | Effect                                      |
| --------------- | ------------ | ------------------------------------------- |
| `theme-glitch`  | cyberpunk    | clip-path slice + skewX on ::before/::after |
| `theme-flicker` | dark-fantasy | opacity 0.99→0.4 + text-shadow colour shift |
| `theme-shimmer` | high-fantasy | gold gradient sweep on ::after              |
| `theme-float`   | fey-wilds    | translateY(-4px) oscillation                |
| `theme-static`  | eldritch     | hue-rotate + contrast filter cycle          |
| `theme-decay`   | undead       | opacity 1→0.7→1 slow pulse                  |

## Risks / Trade-offs

- **FOUC on first load**: `@nuxt/fonts` self-hosts fonts in the build output, eliminating CDN latency. First cold build takes longer; subsequent builds use cached fonts. Acceptable.
- **`border-image` gradient limitation**: `border-image` requires a gradient even for solid-colour borders — `border-image: linear-gradient(var(--primary), var(--primary)) 1` is the correct workaround for solid accent borders.
- **SVG data URI escaping**: SVG must have `#` encoded as `%23` in data URIs. All patterns use named colours or `currentColor` to avoid this.
- **UnifrakturMaguntia** (undead) and **Pacifico** (fey-wilds) are low-legibility display faces — applied to headings only; body text stays on the readable body font, and headings are never below the page's existing `text-lg`/`text-2xl`/`text-3xl` sizes, so no extra min-size guard is needed.
- **Teleport portals** (§4a): theme reaches dialogs/dropdowns/popovers/command palette only because `data-theme` is mirrored onto `<html>`. If that mirroring regresses, those surfaces silently lose theme fonts — covered by an E2E assertion (task 8.4).
- **Font bundle weight / FOUC**: 20 self-hosted Google Fonts add to the build. `@nuxt/fonts` only injects `<link>`/`@font-face` for fonts referenced by the active theme's tokens, and `font-display: swap` (its default) avoids blocking first paint. Task 7.6 verifies only the active theme's fonts are requested and total added weight is acceptable.

## Migration Plan

1. Install `@nuxt/fonts` (one config line).
2. Add `data-slot="card"` to `app/components/ui/card/Card.vue` root, and propagate `data-theme` to `<html>` in `app/layouts/default.vue` (see §4a) for Teleport coverage.
3. Create `app/assets/css/themes.css` with global wiring rules (§4) + all 10 theme token blocks.
4. Add `@import './themes.css'` to `main.css`.
5. Verify no existing tests break (colour tokens unchanged; `campaign-themes.spec.ts` asserts only the `data-theme` attribute on the layout div, which is unchanged).
6. Add visual screenshot tests.
