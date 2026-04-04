## Why

Three components/pages have grown beyond comfortable maintainability thresholds:

1. **MarkdownEditor.client.vue** (522 lines) — mixes TipTap editor setup, a hand-rolled entity mention dropdown (lines 215-297 manually create DOM elements with `document.createElement` instead of using the existing `EntitySuggestionList.vue` component), Hocuspocus collaboration wiring, 15+ toolbar commands, image upload handling, and draft management. Any change to one concern risks breaking another.

2. **Characters list page** (312 lines) — combines 7 filter controls (status, race, class, alignment, organization, location, companions toggle), sort controls, an NPC folder sidebar, character list items with complex badge rendering, URL sync logic, and data loading. Adding a new filter or changing list item layout requires navigating the entire file.

3. **Session detail page** (386 lines) — bundles an attendance/RSVP panel, a decisions timeline with nested consequences and reveal/hide toggles, a collapsible rolls table, content tabs (manual notes / AI notes / summary), session log editing, and status management. Each section is a distinct UI concern with its own state.

## What Changes

- Extract focused sub-components from each oversized file
- Replace raw DOM manipulation in MarkdownEditor's entity mention dropdown with the existing `EntitySuggestionList.vue` Vue component
- Extract toolbar, collaboration provider setup, and entity mention configuration into dedicated modules
- Extract character filter bar, folder sidebar, and list item into reusable components
- Extract session attendance panel, decisions list, rolls table, and content tabs into focused components
- Extract composables where state + logic form a cohesive unit (e.g., `useMarkdownEditorToolbar`, `useCharacterFilters`)

## Capabilities

### Modified Capabilities

- `markdown-editor`: Same editing behavior — toolbar, collaboration, mentions, image upload, drafts all work identically. Architecture improved by splitting into composable units.
- `character-list`: Same filtering, sorting, folder navigation, and display. Filters and list item extracted into reusable components.
- `session-detail`: Same attendance, decisions, rolls, content tabs, and log editing. Each panel extracted into a focused component.

### New Capabilities

None. This is a pure architecture refactor — no user-visible behavior changes.

## Impact

- **app/components/MarkdownEditor.client.vue** — reduced to ~80 lines (orchestrator)
- **app/components/editor/** — new directory: `MarkdownEditorToolbar.vue`, `useCollaborationProvider.ts`, entity mention render function updated to use `EntitySuggestionList.vue`
- **app/components/EntitySuggestionList.vue** — no changes needed (already has the right interface)
- **app/pages/campaigns/[id]/characters/index.vue** — reduced to ~60 lines (orchestrator)
- **app/components/characters/** — new: `CharacterFilterBar.vue`, `CharacterFolderSidebar.vue`, `CharacterListItem.vue`
- **app/pages/campaigns/[id]/sessions/[slug]/index.vue** — reduced to ~80 lines (orchestrator)
- **app/components/sessions/** — new: `SessionAttendancePanel.vue`, `SessionDecisionsList.vue`, `SessionRollsTable.vue`, `SessionContentTabs.vue`
- **No API changes** — server routes untouched
- **No CLI impact** — no endpoint, auth, or data model changes
- **No i18n changes** — same translation keys, just referenced from sub-components
