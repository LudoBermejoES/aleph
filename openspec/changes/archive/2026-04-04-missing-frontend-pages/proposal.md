# Missing Frontend Pages

## Why

Several core features in Aleph have complete server-side CRUD APIs but no corresponding frontend pages, creating dead ends in the user experience:

- **Quests** have a list page and an edit form, but no detail/read-only view. Users can see quest names in the list but cannot click through to view full quest content, sub-quests, or assigned characters without entering edit mode.
- **Arcs & Chapters** have `GET`/`POST` API endpoints and are referenced by sessions (`gameSessions.arcId`, `gameSessions.chapterId`), but zero frontend pages exist. The session form has arc/chapter pickers with no way to manage the underlying data.
- **Entity Templates** have full `GET`/`POST`/`PUT`/`DELETE` endpoints for templates and their fields, yet there is no UI to create, view, or edit templates. The `entities.templateId` foreign key exists in the schema but users cannot leverage it.

These gaps mean DMs must use the CLI or direct API calls for features that should be accessible in the web UI.

## What Changes

1. **Quest detail page** (`app/pages/campaigns/[id]/quests/[slug]/index.vue`) -- read-only view of a quest with all its metadata.
2. **Arcs management pages** -- list, create, detail with inline chapter management.
3. **Entity Templates management pages** -- list, create/edit with field management.
4. Supporting i18n keys in `en.json` and `es.json`, plus E2E tests for each new page.

## Capabilities

- View quest detail with status, description, sub-quests, assigned characters, parent quest, and linked entity
- List, create, and view arcs; manage chapters within arcs
- List, create, edit, and delete entity templates; manage template fields with type-specific configuration
- Navigate from session arc/chapter pickers to arc management
- Apply a template when creating a new entity

## Impact

- **Frontend only** -- no new API endpoints needed; all backends already exist.
- **aleph-cli** -- no changes required (no API surface changes).
- **Existing pages affected**: quest list (add click-through links), session form (add "manage arcs" link), entity create form (add template picker).
- **i18n** -- new keys in `i18n/locales/en.json` and `i18n/locales/es.json`.
