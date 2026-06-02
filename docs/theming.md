# Theming: immersive campaign worlds

Aleph ships ten genre themes that change far more than colors — each gives a campaign its own typography, texture, and decorative chrome, so a cyberpunk game _feels_ different from a high-fantasy one.

## The themes

`dark-fantasy` · `cyberpunk` · `cosmic-horror` · `high-fantasy` · `western` · `steampunk` · `eldritch` · `fey-wilds` · `undead` · `superhero`

(Plus a neutral `default`.) The `undead` theme is styled after _Kult: Divinity Lost_ — contemporary gnostic body horror, not generic medieval undeath.

## How it works

A theme is applied by setting a `data-theme` attribute, which activates a block of CSS custom properties.

- **Where the attribute lives:** the campaign's theme is bound reactively to `data-theme` on the layout root in `app/layouts/default.vue`, _and_ mirrored onto `<html>`. The `<html>` mirror matters because some UI (dialogs, dropdowns, popovers, the command palette) renders through a Teleport to `<body>`, **outside** the layout root — without the mirror, those surfaces wouldn't inherit the theme.
- **Where the styles live:** `app/assets/css/themes.css`, imported at the **top** of `app/assets/css/main.css`. (PostCSS requires `@import` before the `@tailwind` directives — putting it at the bottom silently breaks the import.)

Each `[data-theme='x']` block defines a set of tokens consumed by global wiring rules:

| Token                                                                             | Drives                                                     |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `--theme-font-heading` / `--theme-font-body` / `--theme-font-mono`                | typography on `h1–h3`, body/`p`, `code`/`pre`              |
| `--theme-font-weight-heading`, `--theme-letter-spacing`, `--theme-text-transform` | heading styling                                            |
| `--theme-card-shadow`, `--theme-card-border`                                      | card chrome (matched via `[data-slot='card']`)             |
| `--theme-heading-decoration`                                                      | an ornament injected via `h2::before`                      |
| `--theme-bg-pattern`                                                              | a subtle SVG/gradient texture on the `<main>` content area |

Color tokens for each theme still live in `main.css`; `themes.css` layers the non-color identity on top.

## Fonts

Theme fonts are real Google Fonts, self-hosted at build time by `@nuxt/fonts`. Note: `@nuxt/fonts` only auto-detects fonts referenced in literal `font-family:` declarations — **not** ones hidden inside CSS-variable values like `--theme-font-heading: 'Orbitron'`. So every theme font is **explicitly registered** in `nuxt.config.ts` under `fonts.families` with `global: true`. If you add a theme font, add it there too or it will silently fall back to the system stack.

## Motion

Animations were intentionally removed — flickering/glitch effects proved distracting in actual play. The keyframes remain defined but are not applied; any future motion must sit behind `@media (prefers-reduced-motion: no-preference)`.
