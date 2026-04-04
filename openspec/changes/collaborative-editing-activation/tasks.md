# Collaborative Editing Activation -- Tasks

## Group 1: WebSocket URL Configuration

### Task 1.1: Add runtime config for Hocuspocus URL
- **Files**: `nuxt.config.ts`
- **Changes**: Add `runtimeConfig.public.hocuspocusUrl` with default empty string (triggers fallback derivation)
- **Tests**: Unit test for config presence

### Task 1.2: Create `useCollaborationUrl` composable
- **Files**: `app/composables/useCollaborationUrl.ts`
- **Changes**: Composable that reads `useRuntimeConfig().public.hocuspocusUrl`; if empty, derives WS URL from `window.location` (http->ws, https->wss, append port 3334). Returns a computed string.
- **Tests**: Unit tests covering all three scenarios: explicit config, HTTPS derivation, HTTP derivation

### Task 1.3: Update MarkdownEditor to use composable for WS URL
- **Files**: `app/components/MarkdownEditor.client.vue`
- **Changes**: Replace hardcoded `ws://${window.location.hostname}:3334` (line ~320) with the value from `useCollaborationUrl()`
- **Tests**: Covered by integration/E2E tests in later groups

---

## Group 2: Create `useCollaborationUser` composable

### Task 2.1: User identity composable
- **Files**: `app/composables/useCollaborationUser.ts`
- **Changes**: Composable that fetches the current user session and returns `{ userName, userColor }`. Color is derived by hashing the user ID to a HSL hue (deterministic). Falls back to "Anonymous" and a random color.
- **Tests**: Unit test for color derivation determinism and fallback behavior

---

## Group 3: Wire Collaborative Props Through Forms

### Task 3.1: Add collaborative props to EntityForm
- **Files**: `app/components/forms/EntityForm.vue`
- **Changes**: Accept optional `collaborative`, `documentName`, `userName`, `userColor` props. Pass them through to `<MarkdownEditor>`.
- **Tests**: Covered by E2E tests

### Task 3.2: Add collaborative props to SessionForm
- **Files**: `app/components/forms/SessionForm.vue`
- **Changes**: Same as Task 3.1 -- accept and pass through collaborative props to MarkdownEditor.
- **Tests**: Covered by E2E tests

### Task 3.3: Add collaborative props to QuestForm
- **Files**: `app/components/forms/QuestForm.vue`
- **Changes**: Same as Task 3.1 -- accept and pass through collaborative props to MarkdownEditor.
- **Tests**: Covered by E2E tests

### Task 3.4: Wire collaborative mode in entity edit page
- **Files**: Entity edit page (the page that uses EntityForm)
- **Changes**: Read `route.query.collab === 'true'`, compute `documentName` as `campaign:{id}:entity:{slug}`, fetch user identity via `useCollaborationUser()`, pass all props to EntityForm.
- **Tests**: Covered by E2E tests

### Task 3.5: Wire collaborative mode in session edit page
- **Files**: Session edit page (the page that uses SessionForm)
- **Changes**: Same pattern as Task 3.4 with `documentName="campaign:{id}:session:{sessionId}"`
- **Tests**: Covered by E2E tests

### Task 3.6: Wire collaborative mode in quest edit page
- **Files**: Quest edit page (the page that uses QuestForm)
- **Changes**: Same pattern as Task 3.4 with `documentName="campaign:{id}:quest:{questId}"`
- **Tests**: Covered by E2E tests

---

## Group 4: Extend Hocuspocus Document Name Support

### Task 4.1: Update Hocuspocus `onAuthenticate` to accept session and quest document types
- **Files**: `server/plugins/hocuspocus.ts`
- **Changes**: The current parser requires `parts[2] === 'entity'`. Expand to accept `entity`, `session`, or `quest`. For `session` and `quest`, validate that the referenced record exists and the user has the appropriate role.
- **Tests**: Integration tests for session/quest document auth (extend existing `tests/integration/collaboration.test.ts`)

### Task 4.2: Update Hocuspocus `onLoadDocument` for session and quest types
- **Files**: `server/plugins/hocuspocus.ts`, potentially `server/services/collaboration.ts`
- **Changes**: Load session/quest content from DB when document type is `session` or `quest` (currently only loads entities via file system). Sessions and quests store content in the DB directly, so read from the appropriate table.
- **Tests**: Integration tests for document loading

### Task 4.3: Update Hocuspocus `onStoreDocument` for session and quest types
- **Files**: `server/plugins/hocuspocus.ts`
- **Changes**: Save session/quest content back to the DB when Hocuspocus debounce fires. Currently only saves entity files.
- **Tests**: Integration tests for document persistence

---

## Group 5: Collaboration Indicator Component

### Task 5.1: Create `CollaborationIndicator.vue` component
- **Files**: `app/components/CollaborationIndicator.vue`
- **Changes**: Receives a Hocuspocus `provider` instance as prop. Uses provider awareness to list connected peers (name, color). Shows connection status dot (green/yellow/red). Shows "Editing alone" or "Editing with X, Y" text.
- **Tests**: Unit test for peer list rendering with mock awareness data

### Task 5.2: Integrate indicator into MarkdownEditor
- **Files**: `app/components/MarkdownEditor.client.vue`
- **Changes**: When `collaborative` is true and `provider` is initialized, render `<CollaborationIndicator :provider="provider" />` between the toolbar and the editor content area.
- **Tests**: Covered by E2E tests

---

## Group 6: Add "Collaborate" Button to Detail Pages

### Task 6.1: Add collaborate link to entity detail page
- **Files**: `app/pages/campaigns/[id]/entities/[slug]/index.vue`
- **Changes**: Next to the existing "Edit" button, add a "Collaborate" button that navigates to the edit page with `?collab=true`. Remove the unused `isCollaborative`, `editing`, `saving`, `editForm`, and `userName` refs that are dead code on the detail page.
- **Tests**: E2E test for button visibility and navigation

### Task 6.2: Add collaborate link to session and quest detail pages
- **Files**: Session detail page, quest detail page
- **Changes**: Same pattern as Task 6.1 -- add "Collaborate" button linking to edit with `?collab=true`.
- **Tests**: E2E tests

---

## Group 7: i18n

### Task 7.1: Add collaboration i18n keys
- **Files**: `i18n/locales/en.json`, `i18n/locales/es.json`
- **Changes**: Add keys under a `collaboration` namespace: `editingAlone`, `editingWith`, `connected`, `reconnecting`, `disconnected`, `collaborate` (button label).
- **Tests**: No dedicated test -- covered by E2E rendering

---

## Group 8: Cleanup

### Task 8.1: Remove dead code from entity detail page
- **Files**: `app/pages/campaigns/[id]/entities/[slug]/index.vue`
- **Changes**: Remove `isCollaborative` computed, `editing` ref, `saving` ref, `editForm` reactive, `userName` ref, `saveEntity()` function, and the `fetch('/api/auth/get-session')` call -- all are unused on the detail (read-only) page.
- **Tests**: Existing E2E tests confirm detail page still renders

---

## Group 9: Testing

### Task 9.1: Unit tests for `useCollaborationUrl`
- **Files**: `tests/unit/composables/useCollaborationUrl.test.ts`
- **Scenarios**: Config set explicitly, HTTPS fallback, HTTP fallback, custom port

### Task 9.2: Unit tests for `useCollaborationUser`
- **Files**: `tests/unit/composables/useCollaborationUser.test.ts`
- **Scenarios**: Deterministic color from user ID, fallback to "Anonymous"

### Task 9.3: Unit tests for `CollaborationIndicator`
- **Files**: `tests/unit/components/CollaborationIndicator.test.ts`
- **Scenarios**: Renders "Editing alone" with no peers, renders peer names, shows connection status colors

### Task 9.4: Integration tests for Hocuspocus session/quest documents
- **Files**: `tests/integration/collaboration.test.ts` (extend existing)
- **Scenarios**: Auth succeeds for session doc, auth succeeds for quest doc, auth rejects invalid type, load/store round-trip for session content

### Task 9.5: E2E tests for collaborative editing flow
- **Files**: `tests/e2e/collaborative-editing.spec.ts`
- **Scenarios**: Entity edit page passes collaborative props when `?collab=true`, collaboration indicator appears, "Collaborate" button on detail page navigates correctly, solo mode has no WS connection

### Task 9.6: Verification -- build, lint, full test suite
- **Run**: `npm run build`, `npx eslint .`, `npx vitest run`, `npx playwright test`
- **Confirm**: No regressions, all new tests pass
