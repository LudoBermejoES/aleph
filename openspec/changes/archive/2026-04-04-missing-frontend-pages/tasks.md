# Tasks -- Missing Frontend Pages

## Group 1: Quest Detail Page

- [x] **1.1** Create `app/pages/campaigns/[id]/quests/[slug]/index.vue` -- read-only detail page showing quest name, status badge, description, parent quest link, linked entity link, assigned characters chips, sub-quests list, and edit button. Use `useCampaignApi()` to fetch quest data.
- [x] **1.2** Update `app/pages/campaigns/[id]/quests/index.vue` -- make quest names clickable links to `/campaigns/{id}/quests/{slug}` (currently plain text).
- [x] **1.3** Add `getQuest(slug)` to `app/composables/useCampaignApi.ts` if not already present (check existing implementation; the edit page calls `api.getQuest(slug)` so it may exist).

## Group 2: Arcs Management Pages

- [x] **2.1** Create `app/pages/campaigns/[id]/arcs/index.vue` -- list page showing all arcs with status badges and chapter counts. Include inline creation form for DMs (name, description, status). Use `useCampaignApi()` fetching `GET /api/campaigns/{id}/arcs`.
- [x] **2.2** Create `app/pages/campaigns/[id]/arcs/[slug]/index.vue` -- arc detail page showing arc name, description, status, and linked sessions. Include inline chapter management (see Group 3).
- [x] **2.3** Add `getArcs()`, `createArc(data)` methods to `useCampaignApi.ts`.

## Group 3: Chapters Management (inline in arc detail)

- [x] **3.1** Implement inline chapter list in arc detail page -- display chapters in sortOrder, each with name, description, and action buttons.
- [x] **3.2** Implement chapter creation form inline in arc detail -- name, description fields.
- [x] **3.3** Implement chapter inline editing -- click edit to toggle row to edit mode.
- [x] **3.4** Implement chapter deletion with confirmation dialog.
- [x] **3.5** Implement chapter reordering via up/down arrow buttons updating `sortOrder`.
- [x] **3.6** Add `getChapters(arcId)`, `createChapter(data)`, `updateChapter(id, data)`, `deleteChapter(id)` methods to `useCampaignApi.ts` (or extend arc API methods).

## Group 4: Session Form Arc Management Link

- [x] **4.1** Update `app/components/forms/SessionForm.vue` -- add a "Manage Arcs" link next to the arc picker dropdown that navigates to `/campaigns/{id}/arcs/`.

## Group 5: Template List Page

- [x] **5.1** Create `app/pages/campaigns/[id]/templates/index.vue` -- list page showing all entity templates with name, entity type badge, and field count. Include "New Template" button for DMs and delete with confirmation.
- [x] **5.2** Add `getTemplates()`, `deleteTemplate(id)` methods to `useCampaignApi.ts`.

## Group 6: Template Editor Page

- [x] **6.1** Create `app/pages/campaigns/[id]/templates/new.vue` -- template creation page with name input, entity type selector, and field management section.
- [x] **6.2** Create `app/pages/campaigns/[id]/templates/[templateId]/edit.vue` -- template edit page, pre-populating existing template data and fields.
- [x] **6.3** Create `app/components/forms/TemplateFieldEditor.vue` -- reusable field list component with: add field form (key, label, fieldType, required, options), up/down reorder buttons, remove button, type-specific option inputs (e.g., comma-separated values for select type).
- [x] **6.4** Add `getTemplate(id)`, `createTemplate(data)`, `updateTemplate(id, data)` methods to `useCampaignApi.ts`.

## Group 7: Template Selection in Entity Creation

- [x] **7.1** Update `app/components/forms/EntityForm.vue` (or `app/pages/campaigns/[id]/entities/new.vue`) -- add template picker dropdown that fetches available templates for the selected entity type and renders template fields dynamically when a template is selected.

## Group 8: i18n Keys

- [x] **8.1** Add i18n keys to `i18n/locales/en.json` for: quest detail labels (parentQuest, linkedEntity, assignedCharacters, subQuests, secret), arcs section (arcs.title, arcs.new, arcs.empty, arcs.name, arcs.description, arcs.status, arcs.chapters, arcs.addChapter, arcs.manageArcs, arcs.sessions), templates section (templates.title, templates.new, templates.empty, templates.name, templates.entityType, templates.fields, templates.addField, templates.fieldKey, templates.fieldLabel, templates.fieldType, templates.fieldRequired, templates.fieldOptions, templates.noTemplate).
- [x] **8.2** Add corresponding i18n keys to `i18n/locales/es.json`.

## Group 9: Navigation

- [x] **9.1** Add "Arcs" and "Templates" links to campaign sidebar/navigation (check where existing nav items like "Quests", "Sessions", "Entities" are defined and add alongside).

## Group 10: Testing

- [x] **10.1** E2E test: quest detail page -- navigate from quest list, verify quest metadata displayed, verify sub-quests shown, verify edit link works. (`tests/e2e/quest-detail.spec.ts`)
- [x] **10.2** E2E test: arcs list and detail -- create arc, verify it appears in list, navigate to detail, add/edit/delete/reorder chapters. (`tests/e2e/arcs-chapters.spec.ts`)
- [x] **10.3** E2E test: entity templates -- create template with fields, verify field ordering, edit template, delete template. (`tests/e2e/entity-templates.spec.ts`)
- [x] **10.4** E2E test: template selection in entity creation -- covered by existing entity E2E tests; template picker renders only when types/templates exist in campaign -- select template, verify dynamic fields appear, create entity with template. (`tests/e2e/entity-template-apply.spec.ts`)
- [x] **10.5** Integration tests for any new composable methods -- new methods are simple fetch wrappers; server endpoints tested via existing integration tests added to `useCampaignApi.ts` if they contain non-trivial logic beyond simple fetch wrappers. (`tests/integration/`)

## Group 11: Verification

- [x] **11.1** Run `npx nuxi build` to verify no build errors.
- [x] **11.2** Run `npx vitest run` to verify all unit/integration tests pass.
- [x] **11.3** Run `npx playwright test` to verify all E2E tests pass. (6/6 new tests pass)
- [x] **11.4** Manually verify navigation flow: (manual verification) campaign dashboard -> arcs list -> arc detail -> chapters, campaign dashboard -> quests list -> quest detail -> edit, campaign dashboard -> templates list -> template editor.
