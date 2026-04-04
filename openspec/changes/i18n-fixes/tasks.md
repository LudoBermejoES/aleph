## 1. Add Missing i18n Keys to en.json

- [ ] 1.1 Add `common.campaign` key: `"Campaign"` (for breadcrumb label)
- [ ] 1.2 Add `errors.pageNotFound` key: `"Page not found"` and `errors.backToCampaigns` key: `"Back to Campaigns"` (for 404 page)
- [ ] 1.3 Add `auth.tagline` key: `"TTRPG Campaign Manager"` (for auth layout)
- [ ] 1.4 Add `editor.draftBanner` key: `"You have unsaved changes from a previous session."`, `editor.restoreDraft`: `"Restore draft"`, `editor.discardDraft`: `"Discard"` (for MarkdownEditor draft banner)
- [ ] 1.5 Add `editor.toolbar.*` keys for all toolbar button labels and tooltips:
  - `editor.toolbar.undo`: `"Undo (Ctrl+Z)"`
  - `editor.toolbar.redo`: `"Redo (Ctrl+Shift+Z)"`
  - `editor.toolbar.bold`: `"Bold (Ctrl+B)"`
  - `editor.toolbar.italic`: `"Italic (Ctrl+I)"`
  - `editor.toolbar.strikethrough`: `"Strikethrough"`
  - `editor.toolbar.inlineCode`: `"Inline Code"`
  - `editor.toolbar.heading1`: `"Heading 1"`
  - `editor.toolbar.heading2`: `"Heading 2"`
  - `editor.toolbar.heading3`: `"Heading 3"`
  - `editor.toolbar.bulletList`: `"Bullet List"`
  - `editor.toolbar.orderedList`: `"Ordered List"`
  - `editor.toolbar.taskList`: `"Task List"`
  - `editor.toolbar.blockquote`: `"Blockquote"`
  - `editor.toolbar.codeBlock`: `"Code Block"`
  - `editor.toolbar.horizontalRule`: `"Horizontal Rule"`
  - `editor.toolbar.insertLink`: `"Insert Link"`
  - `editor.toolbar.insertTable`: `"Insert Table"`
  - `editor.toolbar.insertImage`: `"Insert Image"`

## 2. Add Matching Keys to es.json

- [ ] 2.1 Add `common.campaign`: `"Campaña"`
- [ ] 2.2 Add `errors.pageNotFound`: `"Página no encontrada"`, `errors.backToCampaigns`: `"Volver a Campañas"`
- [ ] 2.3 Add `auth.tagline`: `"Gestor de Campañas TTRPG"`
- [ ] 2.4 Add `editor.draftBanner`: `"Tienes cambios sin guardar de una sesión anterior."`, `editor.restoreDraft`: `"Restaurar borrador"`, `editor.discardDraft`: `"Descartar"`
- [ ] 2.5 Add `editor.toolbar.*` keys with Spanish translations:
  - `undo`: `"Deshacer (Ctrl+Z)"`, `redo`: `"Rehacer (Ctrl+Shift+Z)"`
  - `bold`: `"Negrita (Ctrl+B)"`, `italic`: `"Cursiva (Ctrl+I)"`, `strikethrough`: `"Tachado"`, `inlineCode`: `"Código en línea"`
  - `heading1`: `"Encabezado 1"`, `heading2`: `"Encabezado 2"`, `heading3`: `"Encabezado 3"`
  - `bulletList`: `"Lista con viñetas"`, `orderedList`: `"Lista numerada"`, `taskList`: `"Lista de tareas"`
  - `blockquote`: `"Cita"`, `codeBlock`: `"Bloque de código"`, `horizontalRule`: `"Línea horizontal"`
  - `insertLink`: `"Insertar enlace"`, `insertTable`: `"Insertar tabla"`, `insertImage`: `"Insertar imagen"`

## 3. Update 404 Page

- [ ] 3.1 Update `app/pages/[...slug].vue` — replace "Page not found" with `{{ $t('errors.pageNotFound') }}` and "Back to Campaigns" with `{{ $t('errors.backToCampaigns') }}`

## 4. Update Auth Layout

- [ ] 4.1 Update `app/layouts/auth.vue` — replace "TTRPG Campaign Manager" with `{{ $t('auth.tagline') }}`

## 5. Update Breadcrumbs Across All Campaign Sub-Pages

- [ ] 5.1 Replace `>Campaign</NuxtLink>` with `>{{ $t('common.campaign') }}</NuxtLink>` in all 49 pages under `app/pages/campaigns/[id]/`. Full list:
  - `characters/index.vue`, `characters/new.vue`, `characters/[slug]/index.vue`, `characters/[slug]/edit.vue`
  - `entities/index.vue`, `entities/new.vue`, `entities/[slug]/index.vue`, `entities/[slug]/edit.vue`
  - `sessions/index.vue`, `sessions/new.vue`, `sessions/[slug]/index.vue`, `sessions/[slug]/edit.vue`
  - `quests/index.vue`, `quests/new.vue`, `quests/[slug]/edit.vue`
  - `maps/index.vue`, `maps/new.vue`, `maps/[slug]/index.vue`, `maps/[slug]/edit.vue`
  - `timelines/new.vue`, `timelines/[slug]/index.vue`, `timelines/[slug]/edit.vue`
  - `calendars/index.vue`, `calendars/new.vue`, `calendars/[calendarId]/index.vue`, `calendars/[calendarId]/edit.vue`
  - `relations/new.vue`, `relations/[relationId]/edit.vue`
  - `graph.vue`, `members.vue`
  - `organizations/index.vue`, `organizations/new.vue`, `organizations/[slug]/index.vue`, `organizations/[slug]/edit.vue`
  - `shops/index.vue`, `shops/new.vue`, `shops/[slug]/index.vue`, `shops/[slug]/edit.vue`
  - `items/index.vue`, `items/new.vue`, `items/[itemId]/edit.vue`
  - `inventories/index.vue`, `inventories/[invId]/index.vue`
  - `currencies/index.vue`, `transactions/index.vue`
  - `session-groups/index.vue`
  - `locations/new.vue`, `locations/[slug]/index.vue`, `locations/[slug]/edit.vue`

## 6. Update MarkdownEditor Component

- [ ] 6.1 Update `app/components/MarkdownEditor.client.vue` — replace draft banner hardcoded strings:
  - `"You have unsaved changes from a previous session."` -> `{{ $t('editor.draftBanner') }}`
  - `"Restore draft"` button -> `{{ $t('editor.restoreDraft') }}`
  - `"Discard"` button -> `{{ $t('editor.discardDraft') }}`
- [ ] 6.2 Update toolbar button labels and `title` attributes to use `$t('editor.toolbar.*')` keys (undo, redo, bold, italic, strikethrough, inline code, headings, lists, blockquote, code block, HR, link, table, image)

## 7. Testing and Verification

- [ ] 7.1 **Unit test** (`tests/unit/`): Write a Vitest test that loads both `en.json` and `es.json`, asserts all new keys exist in both files, and asserts no value is empty
- [ ] 7.2 **Grep verification**: Run `grep -r '>Campaign</NuxtLink>' app/pages/` and confirm zero results
- [ ] 7.3 **Grep verification**: Run searches for "Page not found", "Back to Campaigns", "TTRPG Campaign Manager", "unsaved changes from a previous" across `app/` templates and confirm zero results
- [ ] 7.4 **Build check**: Run `npm run build` and confirm no TypeScript or compilation errors
- [ ] 7.5 **E2E test** (`tests/e2e/`): Add a Playwright test that sets locale to Spanish and visits the 404 page, verifying Spanish text appears instead of English
