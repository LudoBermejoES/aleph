## Why

Several content pages (arcs, quests, locations, organizations, items) store long-form text in plain DB `text` columns and render it as plain text or raw HTML, even though the editor and viewing infrastructure already exists. At the same time, the `PreviewRoleSwitcher` component appears on arcs, quests, and locations pages but does nothing — URL updates but content never reloads. These two problems share the same root cause: these entities were built before the markdown+secrets pattern was fully established, and were never upgraded.

## What Changes

- **Arcs**: `description` field upgraded to markdown stored in entity file; viewer replaced with `MDC`; editor replaced with `MarkdownEditor`; `PreviewRoleSwitcher` wired to reload; secret-stripping on GET endpoint
- **Chapters**: `description` field within arcs upgraded to markdown (stored in DB text column — no separate file, inline editor)
- **Quests**: `description` field upgraded to markdown stored in entity file; viewer replaced with `MDC`; `QuestForm` already uses `MarkdownEditor` (just needs the viewer fixed and server stripping added)
- **Locations**: `content` field already stored as entity file and editor uses `MarkdownEditor`, but viewer uses `v-html` with a `\n→<br>` hack; replace with `MDC` and add secret stripping; wire `PreviewRoleSwitcher`
- **Organizations**: `description` plain text field upgraded to markdown stored in entity file; viewer and editor upgraded
- **Items**: `description` plain `<textarea>` upgraded to `MarkdownEditor`; viewer upgraded to `MDC`
- **Sessions**: `onPreviewRoleChange` calls a missing `/render` endpoint; add `sessions/[slug]/render.get.ts`
- **All affected pages**: add `watch(route.query.preview_as, ...)` so the combobox actually reloads content without a page refresh

## Capabilities

### New Capabilities

- `markdown-long-text`: Markdown editor + MDC viewer + secret-stripping for arcs, quests, locations, organizations, and items long-text fields

### Modified Capabilities

- `secrets-all-pages`: preview_as switching must reload content reactively on all pages that show PreviewRoleSwitcher; sessions render endpoint must exist
- `markdown-content`: arcs, quests, organizations, and items description fields now stored/served as stripped markdown rather than raw plain text

## Impact

- `server/api/campaigns/[id]/arcs/` — GET/PUT endpoints need `stripSecretBlocks`; arcs may need `filePath` column or keep DB text (design decision)
- `server/api/campaigns/[id]/quests/[slug]/` — GET endpoint needs `stripSecretBlocks`
- `server/api/campaigns/[id]/locations/[slug]` — GET endpoint already strips (via `safeReadEntityFile`); viewer fix only
- `server/api/campaigns/[id]/organizations/` — GET endpoint needs `stripSecretBlocks`
- `server/api/campaigns/[id]/sessions/[slug]/render.get.ts` — new file
- `app/pages/campaigns/[id]/arcs/[slug]/index.vue` — viewer + watcher
- `app/pages/campaigns/[id]/quests/[slug]/index.vue` — viewer + watcher
- `app/pages/campaigns/[id]/locations/[slug]/index.vue` — replace v-html + watcher
- `app/pages/campaigns/[id]/organizations/[slug]/index.vue` — viewer + watcher
- `app/components/forms/ItemForm.vue` — editor upgrade
- `server/db/schema/` — no schema changes needed if we keep description as DB text for arcs/quests/chapters; locations/orgs already have filePath
- E2E tests needed for each page's preview_as switching
