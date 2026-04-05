## 1. Loading Skeletons — Detail Pages

- [x] 1.1 Add `useLoadingState` + `LoadingSkeleton` to `app/pages/campaigns/[id]/entities/[slug]/index.vue`
- [x] 1.2 Add `useLoadingState` + `LoadingSkeleton` to `app/pages/campaigns/[id]/characters/[slug]/index.vue`
- [x] 1.3 Add `useLoadingState` + `LoadingSkeleton` to `app/pages/campaigns/[id]/sessions/[slug]/index.vue`
- [x] 1.4 Add `useLoadingState` + `LoadingSkeleton` to `app/pages/campaigns/[id]/maps/[slug]/index.vue`
- [x] 1.5 Add `useLoadingState` + `LoadingSkeleton` to `app/pages/campaigns/[id]/calendars/[calendarId]/index.vue`
- [x] 1.6 Add `useLoadingState` + `LoadingSkeleton` to `app/pages/campaigns/[id]/timelines/[slug]/index.vue`
- [x] 1.7 Add `useLoadingState` + `LoadingSkeleton` to `app/pages/campaigns/[id]/shops/[slug]/index.vue`
- [x] 1.8 Add `useLoadingState` + `LoadingSkeleton` to `app/pages/campaigns/[id]/locations/[slug]/index.vue`

## 2. Loading Skeletons — Dashboard and Graph

- [x] 2.1 Add `useLoadingState` + `LoadingSkeleton` to `app/pages/campaigns/[id]/index.vue` (campaign dashboard)
- [x] 2.2 Add `useLoadingState` + `LoadingSkeleton` to `app/pages/campaigns/[id]/graph.vue`

## 3. Error State Handling — Replace Silent Catches

- [x] 3.1 Refactor `app/pages/campaigns/[id]/entities/index.vue` — replace `.catch(() => [])` with `withLoading` + `ErrorToast`
- [x] 3.2 Refactor `app/pages/campaigns/[id]/entities/[slug]/index.vue` — replace `.catch(() => [])` with error handling
- [x] 3.3 Refactor `app/pages/campaigns/[id]/organizations/index.vue` — replace `.catch(() => [])` with error handling
- [x] 3.4 Refactor `app/pages/campaigns/[id]/organizations/[slug]/index.vue` — replace `.catch(() => [])` with error handling
- [x] 3.5 Refactor `app/pages/campaigns/[id]/characters/[slug]/index.vue` — replace `.catch(() => [])` with error handling
- [x] 3.6 Refactor `app/pages/campaigns/[id]/sessions/[slug]/index.vue` — replace `.catch(() => [])` with error handling
- [x] 3.7 Refactor `app/pages/campaigns/[id]/calendars/index.vue` — replace `.catch(() => [])` with error handling
- [x] 3.8 Refactor `app/pages/campaigns/[id]/calendars/[calendarId]/index.vue` — replace `.catch(() => [])` with error handling
- [x] 3.9 Refactor `app/pages/campaigns/[id]/timelines/[slug]/index.vue` — replace `.catch(() => [])` with error handling
- [x] 3.10 Refactor `app/components/forms/SessionForm.vue` — replace `.catch(() => [])` with error handling
- [x] 3.11 Refactor `app/components/forms/CharacterForm.vue` — replace `.catch(() => [])` with error handling

## 4. Dialog Standardization — Session-Groups Modal

- [x] 4.1 Replace the hand-rolled `div.fixed.inset-0` modal in `app/pages/campaigns/[id]/session-groups/index.vue` with shadcn-vue `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle`/`DialogFooter`
- [x] 4.2 Ensure the new Dialog has `aria-labelledby` pointing to the dialog title
- [x] 4.3 Verify focus trap and Escape key dismissal work correctly

## 5. Dialog Standardization — MarkdownEditor Link Insertion

- [x] 5.1 Replace `prompt('Enter URL:')` in `app/components/MarkdownEditor.client.vue` with an inline shadcn-vue Dialog containing a labelled text input
- [x] 5.2 Implement Cancel button (closes dialog, no insertion) and Insert button (inserts link, closes dialog)
- [x] 5.3 Support Enter key to submit and Escape key to cancel in the link dialog
- [x] 5.4 Ensure focus returns to the toolbar button after the dialog closes

## 6. Aria-Labels — MarkdownEditor Toolbar

- [x] 6.1 Add `aria-label` with i18n keys to every toolbar button in `app/components/MarkdownEditor.client.vue` (bold, italic, heading, list, link, code, etc.)
- [x] 6.2 Add corresponding i18n keys (`aria.markdownEditor.*`) to `i18n/locales/en.json`
- [x] 6.3 Add corresponding i18n keys to `i18n/locales/es.json`

## 7. Aria-Labels — DiceRoller Buttons

- [x] 7.1 Add `aria-label` with i18n keys to all dice buttons in `app/pages/campaigns/[id]/index.vue` (d4, d6, d8, d10, d12, d20)
- [x] 7.2 Add corresponding i18n keys (`aria.diceRoller.*`) to `i18n/locales/en.json`
- [x] 7.3 Add corresponding i18n keys to `i18n/locales/es.json`

## 8. Aria-Labels — Select Elements

- [x] 8.1 Add `aria-label` to entity type filter `<select>` in `app/pages/campaigns/[id]/entities/index.vue`
- [x] 8.2 Add `aria-label` to character status filter `<select>` in `app/pages/campaigns/[id]/characters/index.vue`
- [x] 8.3 Add `aria-label` to inventory owner type filter `<select>` in `app/pages/campaigns/[id]/inventories/index.vue`
- [x] 8.4 Add `aria-label` to inventory create owner type `<select>` in `app/pages/campaigns/[id]/inventories/index.vue`
- [x] 8.5 Add `aria-label` to session status `<select>` in `app/pages/campaigns/[id]/sessions/[slug]/index.vue`
- [x] 8.6 Add `aria-label` to session decision type `<select>` in `app/pages/campaigns/[id]/sessions/[slug]/index.vue`
- [x] 8.7 Ensure member role `<select>` elements in `app/pages/campaigns/[id]/members.vue` have labels (invite role select already has label; verify change-role select)
- [x] 8.8 Add `aria-label` to location character and organization `<select>` elements in `app/pages/campaigns/[id]/locations/[slug]/index.vue`
- [x] 8.9 Add corresponding i18n keys (`aria.filters.*`, `aria.forms.*`) to `i18n/locales/en.json` and `i18n/locales/es.json`

## 9. Keyboard Navigation — Character Filters

- [x] 9.1 Wrap the character filter bar in `app/pages/campaigns/[id]/characters/index.vue` with `role="toolbar"` and `aria-label`
- [x] 9.2 Ensure all filter controls (selects, search input, tag buttons) are reachable via Tab within the toolbar

## 10. SearchCommand ARIA Improvements

- [x] 10.1 Add `aria-label` to the search input in `app/components/SearchCommand.vue` (or `app/layouts/default.vue` where it is mounted)
- [x] 10.2 Verify result items have `role="option"` and the results container has `role="listbox"` (shadcn-vue Command may already provide this — audit and fix if needed)

## 11. Testing — Accessibility

- [x] 11.1 E2E test: verify all detail pages show LoadingSkeleton while loading (can use network throttling or intercepted slow responses)
- [x] 11.2 E2E test: verify ErrorToast appears on at least one page when API returns 500 (mock server error)
- [x] 11.3 E2E test: verify session-groups dialog traps focus, closes on Escape, and has `role="dialog"`
- [x] 11.4 E2E test: verify MarkdownEditor link dialog opens, accepts input, inserts link, and closes on Escape
- [x] 11.5 Unit test: verify MarkdownEditor toolbar buttons each have an `aria-label` attribute
- [x] 11.6 Unit test: verify DiceRoller buttons each have an `aria-label` attribute
- [x] 11.7 E2E test: verify `<select>` elements on entities, characters, inventories, sessions pages have accessible names (aria-label or associated label)
- [x] 11.8 E2E test: verify character filter toolbar has `role="toolbar"` and keyboard navigation works
- [x] 11.9 Integrate `@axe-core/playwright` into Playwright config for automated a11y violation scanning on key pages (dashboard, entity list, character list, session detail)

## 12. Verification

- [x] 12.1 Run `npx vitest run tests/unit/` — all unit tests pass
- [x] 12.2 Run `npx vitest run tests/integration/` — all integration tests pass (server on port 3333)
- [x] 12.3 Run `npx playwright test` — all E2E tests pass
- [x] 12.4 Run `npx nuxi build` — build succeeds with no errors
