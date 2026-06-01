## Why

All 10 campaign themes currently change only color tokens. Switching between dark-fantasy, cyberpunk, or fey-wilds produces colour-swap pages that feel interchangeable. Players and GMs spend hours inside these campaigns; the visual environment should feel like the world they are roleplaying in. Research confirms that typography, background texture, decorative borders, and subtle animation together create the genre immersion that colour alone cannot deliver — and all of it is achievable in pure CSS with no new binary assets.

## What Changes

- **10 new Google Fonts pairings** — one display/heading font and one body font per theme, loaded on demand via `@nuxt/fonts`.
- **11 new CSS custom-property tokens per theme** — typography (`--theme-font-heading`, `--theme-font-body`, `--theme-font-mono`, `--theme-font-weight-heading`, `--theme-letter-spacing`, `--theme-text-transform`) and decoration (`--theme-card-shadow`, `--theme-card-border`, `--theme-heading-decoration`, `--theme-bg-pattern`, `--theme-animation`).
- **10 SVG background textures** — inline data-URI patterns (circuit board, stone, star field, cross-hatch, wood grain, hex/gear, warped grid, floral, bone, halftone) applied via `--theme-bg-pattern`.
- **6 CSS keyframe animations** — glitch (cyberpunk), flicker (dark-fantasy / undead), shimmer (high-fantasy), float (fey-wilds), static-noise (eldritch), decay-pulse (undead); all gated behind `prefers-reduced-motion`.
- **A new `app/assets/css/themes.css`** that owns all theme declarations, keeping `main.css` lean.
- **Global CSS wiring** — `h1`/`h2`/`h3`, card components (`[data-slot=card]`), and the `<main>` content area consume the new tokens via shared rules in `themes.css`.
- **`data-theme` propagated to `<html>`** so theme fonts/decoration also reach Teleport-portalled UI (dialogs, dropdowns, popovers, command palette) that render outside the layout root.

## Capabilities

### New Capabilities

- `immersive-campaign-themes`: Per-theme typography, texture backgrounds, decorative card/heading styles, and optional micro-animations that together make each campaign theme feel like a distinct visual world.

### Modified Capabilities

- `campaign-themes`: The existing colour-token spec is extended — new non-colour tokens are added to each `[data-theme]` block; no existing colour tokens are changed or removed.

## Impact

**CSS** (`app/assets/css/`): new `themes.css` imported from `main.css`; existing theme blocks in `main.css` remain intact.

**Nuxt config** (`nuxt.config.ts`): add `@nuxt/fonts` module (or `useHead` composable approach) for on-demand Google Fonts loading.

**Minimal component/layout edits** — almost everything is pure CSS, but two small hooks are required because the current markup has nothing to target:

- `app/components/ui/card/Card.vue`: add `data-slot="card"` to the root `<div>` (no class/attribute exists today for the card-decoration rule to match).
- `app/layouts/default.vue`: propagate `data-theme` onto the document root (`<html>`) — currently it lives only on the layout `<div>`, so Teleport-portalled components (dialogs, dropdowns, popovers, command palette) render outside it and would not inherit theme fonts/decoration. The `<main>` element is targeted directly via `[data-theme] main` (no edit needed).

**No new image files** — all textures are inline SVG data URIs or CSS gradients.

**Tests**: visual regression / Playwright screenshot tests for each theme; unit test verifying font tokens are set per theme; accessibility test confirming `prefers-reduced-motion` disables all animations.
