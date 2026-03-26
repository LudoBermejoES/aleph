## Why

Aleph currently has all UI strings hardcoded in English across ~60+ pages and components. Adding i18n support allows the app to be used in other languages (starting with Spanish, given the project's context) without touching component logic, and establishes the infrastructure for community-contributed translations.

## What Changes

- Install and configure `@nuxtjs/i18n` (Nuxt 4 compatible)
- Create locale files (`en.json`, `es.json`) covering all UI strings
- Replace every hardcoded UI string in pages, components, and layouts with `$t()` / `useI18n()` calls
- Add a language switcher to the user interface
- Server-side error messages remain in English (API responses are developer-facing)

## Capabilities

### New Capabilities

- `i18n-core`: Translation infrastructure — `@nuxtjs/i18n` config, locale files, language detection and switching
- `i18n-ui-strings`: All pages and components using translation keys instead of hardcoded strings (en + es locales complete)

### Modified Capabilities

- `frontend-api-layer`: No requirement changes — composable return values remain unchanged; only the display layer changes

## Impact

- **Files affected**: `nuxt.config.ts`, all `app/pages/**/*.vue`, all `app/components/**/*.vue`, `app/layouts/default.vue`
- **New files**: `app/i18n/locales/en.json`, `app/i18n/locales/es.json`
- **Dependencies**: `@nuxtjs/i18n` (Nuxt 4 compatible version)
- **No DB changes** — locale preference stored in localStorage / URL prefix, not persisted server-side initially
- **No breaking API changes**
