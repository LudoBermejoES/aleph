## Why

A UX audit of the Aleph frontend revealed three systemic gaps that erode perceived quality despite the app being functionally complete:

1. **Loading skeletons exist but are underused.** The `LoadingSkeleton` component and `useLoadingState` composable are well-designed and already applied to most list pages, but detail pages (entity, character, session, map, calendar, timeline, shop, location), the campaign dashboard, and the graph page lack them entirely. Users see blank or jarring content flashes while data loads.

2. **Errors are silently swallowed.** At least 11 pages use `.catch(() => [])`, converting API failures into empty arrays. Users see an empty list with no indication that something went wrong. The `ErrorToast` component exists and is used on some pages, but the pattern is inconsistent.

3. **Accessibility is neglected in several interactive components.** The MarkdownEditor toolbar, DiceRoller, session-groups modal, character filters, and SearchCommand all have gaps: missing aria-labels, hand-rolled dialogs without role/keyboard-trap, unlabelled selects, and `prompt()` usage instead of accessible dialogs.

Fixing these together ensures a consistent, perceivable, and operable UI across the entire app.

## What Changes

- Add `LoadingSkeleton` + `useLoadingState` to all detail pages and the campaign dashboard/graph that currently lack them
- Replace silent `.catch(() => [])` patterns with proper error state display using `ErrorToast`
- Add `aria-label` attributes to MarkdownEditor toolbar buttons and DiceRoller buttons
- Replace the hand-rolled session-groups modal with the shadcn-vue `Dialog` component (proper role, focus trap, Escape key)
- Replace `prompt()` in MarkdownEditor link insertion with an accessible dialog
- Add `<label>` elements or `aria-label` to all `<select>` elements that lack them
- Add keyboard navigability to character filter controls
- Ensure SearchCommand uses proper ARIA menu/listbox semantics

## Capabilities

### Modified Capabilities

- `entity-detail-ui`: All detail pages show loading skeletons and meaningful error states
- `campaign-dashboard`: Dashboard shows loading skeleton while data loads
- `relationship-graph`: Graph page shows loading skeleton
- `map-detail`: Map detail page has loading and error handling
- `markdown-editor`: Toolbar buttons have aria-labels; link insertion uses accessible dialog instead of `prompt()`
- `dice-roller`: Dice buttons have descriptive aria-labels
- `session-group-management`: Modal replaced with proper Dialog component
- `character-list`: Filter controls are keyboard-navigable
- `search-command`: Dropdown uses proper ARIA menu semantics
- `list-pages`: Silent error swallowing replaced with visible error feedback

## Impact

- **Detail pages** (`entities/[slug]/index.vue`, `characters/[slug]/index.vue`, `sessions/[slug]/index.vue`, `maps/[slug]/index.vue`, `calendars/[calendarId]/index.vue`, `timelines/[slug]/index.vue`, `shops/[slug]/index.vue`, `locations/[slug]/index.vue`) -- add LoadingSkeleton + useLoadingState
- **Dashboard** (`campaigns/[id]/index.vue`) -- add LoadingSkeleton
- **Graph** (`campaigns/[id]/graph.vue`) -- add LoadingSkeleton
- **11 pages with `.catch(() => [])`** -- replace with error handling via ErrorToast/useLoadingState
- **`app/components/MarkdownEditor.client.vue`** -- aria-labels on toolbar, replace `prompt()` with dialog
- **`app/pages/campaigns/[id]/index.vue`** (DiceRoller section) -- aria-labels on dice buttons
- **`app/pages/campaigns/[id]/session-groups/index.vue`** -- replace hand-rolled modal with shadcn Dialog
- **`app/pages/campaigns/[id]/characters/index.vue`** -- keyboard nav for filters
- **`app/components/SearchCommand.vue`** -- ARIA menu semantics
- **Multiple pages with `<select>`** -- add label/aria-label associations
- **`i18n/locales/en.json` + `es.json`** -- new keys for aria-labels and error messages
- **CLI impact**: None. No API endpoints, auth flows, or data models are changed.
