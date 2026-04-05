# Tasks: Collaborative Editing Activation

## Group 1: WebSocket URL Configuration

- [x] 1.1 Add `runtimeConfig.public.hocuspocusUrl` to `nuxt.config.ts` with default empty string
- [x] 1.2 Create `app/composables/useCollaborationUrl.ts` — derive WS URL from config or `window.location`
- [x] 1.3 Update `MarkdownEditor.client.vue` to use `useCollaborationUrl()` instead of hardcoded WS URL

## Group 2: User Identity Composable

- [x] 2.1 Create `app/composables/useCollaborationUser.ts` — return `{ userName, userColor }` with deterministic color from user ID

## Group 3: Wire Collaborative Props Through Forms

- [x] 3.1 Add optional `collaborative`, `documentName`, `userName`, `userColor` props to `EntityForm.vue` and pass to MarkdownEditor
- [x] 3.2 Add same optional collaborative props to `SessionForm.vue` and pass to MarkdownEditor
- [x] 3.3 Add same optional collaborative props to `QuestForm.vue` and pass to MarkdownEditor
- [x] 3.4 Wire collaborative mode in entity edit page — read `?collab=true`, compute `documentName`, fetch user identity, pass to EntityForm
- [x] 3.5 Wire collaborative mode in session edit page — same pattern with `campaign:{id}:session:{sessionId}`
- [x] 3.6 Wire collaborative mode in quest edit page — same pattern with `campaign:{id}:quest:{questId}`

## Group 4: Extend Hocuspocus Document Name Support

- [x] 4.1 Update `onAuthenticate` in `server/plugins/hocuspocus.ts` to accept `session` and `quest` document types (not just `entity`)
- [x] 4.2 Update `onLoadDocument` to load session/quest content from DB when doc type is `session` or `quest`
- [x] 4.3 Update `onStoreDocument` to save session/quest content back to DB

## Group 5: Collaboration Indicator Component

- [x] 5.1 Create `app/components/CollaborationIndicator.vue` — shows connected peers (name + color dot) and connection status
- [x] 5.2 Integrate `CollaborationIndicator` into `MarkdownEditor.client.vue` — render when `collaborative` is true

## Group 6: Add "Collaborate" Button to Detail Pages

- [x] 6.1 Add "Collaborate" button to entity detail page linking to edit with `?collab=true`
- [x] 6.2 Add "Collaborate" button to session and quest detail pages

## Group 7: i18n

- [x] 7.1 Add collaboration keys to `i18n/locales/en.json` and `es.json` (`editingAlone`, `editingWith`, `connected`, `reconnecting`, `disconnected`, `collaborate`)

## Group 8: Cleanup

- [x] 8.1 Remove dead code from entity detail page (`isCollaborative`, `editing`, `saving`, `editForm`, `userName` refs, `saveEntity()`, stale session fetch)

## Group 9: Testing

- [x] 9.1 Unit tests for `useCollaborationUrl` — explicit config, HTTPS fallback, HTTP fallback
- [x] 9.2 Unit tests for `useCollaborationUser` — deterministic color, fallback to "Anonymous"
- [x] 9.3 Unit tests for `CollaborationIndicator` — renders peers, connection status
- [x] 9.4 Integration tests for Hocuspocus session/quest document auth
- [x] 9.5 E2E tests — "Collaborate" button navigates correctly, collaborative props wired with `?collab=true`
- [x] 9.6 Verification — build, lint, full test suite
