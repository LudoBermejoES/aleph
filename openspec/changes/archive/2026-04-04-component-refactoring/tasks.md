## 1. MarkdownEditor Split

- [x] 1.1 Create `app/composables/useEditorState.ts` — extract the `editorState` reactive object and `updateEditorState()` function from MarkdownEditor.client.vue (lines 125-147). Returns `{ editorState, updateEditorState }` given an editor ref.
- [x] 1.2 Create `app/composables/useCollaborationProvider.ts` — extract Y.Doc creation, WS token fetch, HocuspocusProvider setup, and Collaboration/CollaborationCaret extension configuration (lines 307-336). Returns `{ extensions, cleanup }`. Handles `onUnmounted` cleanup internally.
- [x] 1.3 Create `app/components/editor/MarkdownEditorToolbar.vue` — extract the entire toolbar template (lines 12-55) and all formatting command functions (lines 386-427). Props: `editor: Editor | null`, `editorState: EditorState`, `campaignId?: string`. Emits: `image-picked(file: File)`.
- [x] 1.4 Replace the raw DOM entity mention dropdown (lines 215-297) with TipTap's `VueRenderer` mounting `EntitySuggestionList.vue`. Use manual positioning (fixed div) matching the current behavior. This eliminates ~80 lines of `document.createElement` code and reuses the existing Vue component which already has keyboard navigation, selection highlighting, and empty state.
- [x] 1.5 Rewrite `MarkdownEditor.client.vue` as an orchestrator (~80 lines) that composes `MarkdownEditorToolbar`, `useEditorState`, `useCollaborationProvider`, and `useEditorDraft`. Template: draft banner + toolbar component + editor div.

## 2. Characters List Split

- [x] 2.1 Create `app/composables/useCharacterFilters.ts` — extract all 11 filter/sort refs, `initFromUrl()`, `syncUrl()`, `onFilterChange()`, `setType()`, `toggleSortDir()`, and the debounced search watcher (lines 198-301). Returns the reactive filter state and mutation functions.
- [x] 2.2 Create `app/components/characters/CharacterFilterBar.vue` — extract the PC/NPC toggle, search input, filter dropdowns (status, race, class, alignment, organization, location, companions), and sort controls (lines 22-100). Props: filter state from composable, meta (races, classes), organizations, locationOptions. Emits: filter change events.
- [x] 2.3 Create `app/components/characters/CharacterFolderSidebar.vue` — extract the NPC folder sidebar (lines 104-118). Props: `folders`, `selectedFolder`, `visible` (computed from typeFilter). Emits: `select-folder(folderId: string)`.
- [x] 2.4 Create `app/components/characters/CharacterListItem.vue` — extract the per-character link block (lines 124-167). Props: `character: Character`, `campaignId: string`. Renders portrait, name, type badge, race, class, alignment, companion indicator, location indicator, org badge, and status badge with color coding.
- [x] 2.5 Rewrite `characters/index.vue` as an orchestrator (~60 lines) that composes `useCharacterFilters`, `CharacterFilterBar`, `CharacterFolderSidebar`, and `CharacterListItem`. Template: breadcrumb + header + filter bar + sidebar/list layout.

## 3. Session Detail Split

- [x] 3.1 Create `app/components/sessions/SessionAttendancePanel.vue` — extract the attendance section (lines 37-63). Props: `attendance: any[]`, `canManage: boolean`, `myRsvp: string`, `rsvpStatuses`. Emits: `set-rsvp(status)`, `set-attended(userId, attended)`.
- [x] 3.2 Create `app/components/sessions/SessionDecisionsList.vue` — extract the decisions timeline with consequence management (lines 108-189). Props: `decisions`, `canManage: boolean`. Emits: `add-decision(data)`, `add-consequence(decisionId, data)`, `toggle-consequence(decisionId, consequenceId, revealed)`. Owns local form state (`showAddDecision`, `newDecision`, `addingConsequenceFor`, `newConsequence`).
- [x] 3.3 Create `app/components/sessions/SessionRollsTable.vue` — extract the collapsible rolls section (lines 192-221). Props: `rolls: any[]`, `loading: boolean`. Emits: `toggle`. Parent controls open/closed state and lazy-loads rolls on first expand.
- [x] 3.4 Create `app/components/sessions/SessionContentTabs.vue` — extract the content tabs section (lines 80-105). Props: `tabs`, `contentDraft: Record<string, string>`, `loading: boolean`. Emits: `save(tabKey, content)`. Owns local `activeContentTab` and `editingContent` state.
- [x] 3.5 Rewrite `sessions/[slug]/index.vue` as an orchestrator (~80 lines) that composes the four panel components. Template: breadcrumb + header + status controls + attendance panel + session log + content tabs + decisions list + rolls table.

## 4. Testing

- [x] 4.1 **Unit tests** (`tests/unit/composables/`) — test `useEditorState`: verify it returns correct active states given a mock editor. Test `useCharacterFilters`: verify URL sync, `setType` resets folder, `toggleSortDir` flips direction, debounced search.
- [x] 4.2 **Unit tests** (`tests/unit/components/`) — test `CharacterListItem`: verify all badge variants render (alive/dead/missing/unknown status, with/without race/class/alignment/companion/location/org). Test `SessionRollsTable`: verify table renders rows and empty state.
- [x] 4.3 **E2E tests** (`tests/e2e/`) — run existing MarkdownEditor E2E tests (toolbar formatting, entity mentions, image upload) and verify they pass without modification. If any tests reference internal structure that changed, update selectors.
- [x] 4.4 **E2E tests** (`tests/e2e/`) — run existing character list E2E tests (filtering, sorting, folder navigation, search) and verify they pass without modification.
- [x] 4.5 **E2E tests** (`tests/e2e/`) — run existing session detail E2E tests (attendance, decisions, consequences, rolls, content tabs) and verify they pass without modification.
- [ ] 4.6 **Verification** — run `npx nuxi typecheck` to confirm no TypeScript regressions. Run
      `npx vitest run` for full unit/integration suite. Run `npx playwright test` for full E2E
      suite. **Triaje 2026-09-01: las tres partes tienen veredictos DISTINTOS.** 1. `npx nuxi typecheck` — **OBSOLETA, no ejecutable en este repo.** `vue-tsc` no es
      dependencia (`package.json` solo trae `typescript 5.9`), así que `npx` se baja una copia
      suelta y el comando muere con
      `ERR_PACKAGE_PATH_NOT_EXPORTED: './lib/tsc' is not defined by "exports"` — un fallo de
      herramienta, no del código. Medido hoy. El equivalente que sí corre es `nuxt build`, que
      CI ejecuta en cada push. 2. `npx vitest run` (unit + integración) — **VERDE**, en el run de CI `33513381822`
      (2026-09-01): job `test` corre `npx vitest run tests/unit/`, job `integration-test` corre
      `npm run test:integration`; los dos `success`. 3. `npx playwright test` (suite E2E completa) — **NO PASA HOY.** No se corrió entera en esta
      pasada (≈1 h), pero 4 de sus tests fallan de forma determinista por una causa ya
      localizada; ver la tarea 7.4 de
      `2026-05-23-editable-relations-on-detail-pages/tasks.md`. Queda como deuda real
      compartida con aquel cambio, no de éste.
