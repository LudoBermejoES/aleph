## Why

The initial i18n migration (2026-03-26-internationalization) converted the bulk of UI strings to `$t()` calls, but a subsequent audit reveals ~50 pages and components still containing hardcoded English text. These fall into systematic patterns: every breadcrumb "Campaign" link across all campaign sub-pages, the 404 page, the auth layout tagline, the MarkdownEditor draft-restore banner and toolbar button labels. Users switching to Spanish see English fragments scattered throughout the app, undermining the i18n effort.

## What Changes

- Add missing i18n keys to `i18n/locales/en.json` and `i18n/locales/es.json` covering: 404 page, auth layout tagline, breadcrumb "Campaign" label, MarkdownEditor draft banner and toolbar tooltips/labels
- Replace all remaining hardcoded English strings in templates with `$t()` calls
- No new dependencies, no schema changes, no new components

## Capabilities

### Modified Capabilities

- `i18n-completeness`: All user-visible strings in pages, layouts, and components use translation keys — no hardcoded English remains in templates

## Impact

- **Files affected**:
  - `i18n/locales/en.json` — new keys added
  - `i18n/locales/es.json` — matching Spanish translations added
  - `app/pages/[...slug].vue` — 404 page
  - `app/layouts/auth.vue` — tagline
  - `app/components/MarkdownEditor.client.vue` — draft banner + toolbar labels
  - ~49 pages under `app/pages/campaigns/[id]/` — breadcrumb "Campaign" text
- **No DB changes**
- **No breaking API changes**
- **No CLI impact** — purely frontend display-layer changes
