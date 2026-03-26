## Technical Approach

Use `@nuxtjs/i18n` (v9, compatible with Nuxt 4) with the `useT` / `$t` composable pattern. Locale files live in `app/i18n/locales/` as flat JSON. No URL prefix strategy — locale is stored in a cookie/localStorage via the `i18n` module's `detectBrowserLanguage` option to avoid breaking existing routes.

## Package

```
@nuxtjs/i18n@^9.x
```

Nuxt 4 compatible. Auto-imports `useI18n()` in components, `$t()` available in templates.

## nuxt.config.ts

```ts
i18n: {
  locales: [
    { code: 'en', name: 'English', file: 'en.json' },
    { code: 'es', name: 'Español', file: 'es.json' },
  ],
  defaultLocale: 'en',
  strategy: 'no_prefix',
  lazy: true,
  langDir: 'i18n/locales/',
  detectBrowserLanguage: {
    useCookie: true,
    cookieKey: 'i18n_redirected',
    redirectOn: 'root',
    fallbackLocale: 'en',
  },
}
```

`strategy: 'no_prefix'` keeps all existing routes unchanged (`/campaigns/...` not `/en/campaigns/...`).

## Locale File Structure

```
app/i18n/locales/
├── en.json
└── es.json
```

Flat namespaced keys grouped by area:

```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "create": "Create",
    "loading": "Loading...",
    "saving": "Saving..."
  },
  "auth": {
    "signIn": "Sign In",
    "register": "Create Account",
    "email": "Email",
    "password": "Password"
  },
  "campaigns": {
    "title": "Campaigns",
    "new": "New Campaign",
    "empty": "No campaigns yet. Create your first one to get started."
  },
  "characters": { ... },
  "sessions": { ... },
  ...
}
```

## Component Usage

In `<template>`:
```html
<Button>{{ $t('common.save') }}</Button>
<p>{{ $t('campaigns.empty') }}</p>
```

In `<script setup>`:
```ts
const { t } = useI18n()
const errorMsg = t('auth.invalidCredentials')
```

## Language Switcher

Add a `<LanguageSwitcher>` component to `app/layouts/default.vue` in the top nav. Uses `useI18n().setLocale(code)` — no page reload needed with `strategy: 'no_prefix'`.

```vue
<select @change="setLocale($event.target.value)">
  <option v-for="locale in locales" :key="locale.code" :value="locale.code">
    {{ locale.name }}
  </option>
</select>
```

## Migration Strategy

Work area by area to avoid a single massive PR:
1. Install + configure (no string changes yet — verify build passes)
2. Create complete `en.json` from all hardcoded strings
3. Migrate pages and components group by group (auth → campaigns → characters → ...)
4. Create `es.json` translations
5. Add language switcher
6. Verify no raw keys visible, run E2E tests

## No DB Changes

Locale preference is stored client-side (cookie). No server changes needed. API error messages remain in English — they are developer/DM-facing, not end-user-facing in most cases.
