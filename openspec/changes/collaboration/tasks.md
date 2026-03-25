# Tasks: Collaboration

## 1. Service Layer -- TDD (tests first)

### 1a. Write unit tests (RED phase)

- [x] 1.1 Test markdownToTiptap: standard markdown (headings, bold, lists) produces correct Tiptap JSON nodes
- [ ] 1.2 Test markdownToTiptap: `:entity-link` MDC produces entity-link Tiptap node with slug attribute
- [x] 1.3 Test tiptapToMarkdown: Tiptap JSON with headings/bold/lists produces correct markdown string
- [ ] 1.4 Test tiptapToMarkdown: entity-link Tiptap node produces `:entity-link{slug}` MDC syntax
- [x] 1.5 Test round-trip: markdown → Tiptap JSON → markdown produces identical output (isRoundTripSafe)
- [ ] 1.6 Test round-trip: `:::secret{.dm}` block with content round-trips correctly
- [x] 1.7 Test mergeFrontmatter: unchanged fields preserved, changed fields updated
- [x] 1.8 Test mergeFrontmatter: created_at never overwritten
- [x] 1.9 Test mergeFrontmatter: new fields added, missing fields use defaults

### 1b. Implement services (GREEN phase)

- [x] 1.10 Implement `markdownToTiptap(md)` using editor.markdown.parse() + jsdom shim
- [x] 1.11 Implement `tiptapToMarkdown(json)` using editor.getMarkdown()
- [x] 1.12 Implement `mergeFrontmatter(existing, updated)` preserving created_at
- [x] 1.13 Implement `isRoundTripSafe(markdown)` using parse+serialize comparison
- [x] 1.14 Verify all unit tests pass

## 2. Tiptap 3 Editor Integration

- [x] 2.1 Install Tiptap 3 with StarterKit, Placeholder, Typography, Link, Image, Table extensions
- [x] 2.2 Install and configure @tiptap/markdown for bidirectional serialization
- [x] 2.3 Create `MarkdownEditor.client.vue` component wrapping Tiptap with toolbar
- [x] 2.4 Implement load flow: read .md → markdown.parse() → setContent
- [ ] 2.5 Build custom Tiptap node for `:entity-link` MDC component
- [ ] 2.6 Build custom Tiptap node for `:::secret` block MDC component
- [x] 2.7 Replace existing markdown textarea with MarkdownEditor on entity edit pages

## 3. Y.js + Hocuspocus Setup

- [ ] 3.1 Install @hocuspocus/server and configure as Nitro plugin
- [ ] 3.2 Implement `onLoadDocument`: read .md file → markdownToTiptap → hydrate Y.js doc
- [ ] 3.3 Implement `onStoreDocument`: Y.js → tiptapToMarkdown → mergeFrontmatter → write .md
- [ ] 3.4 Implement `onAuthenticate`: validate session token + RBAC permission check
- [ ] 3.5 Configure document naming: `campaign:{id}:entity:{slug}`
- [ ] 3.6 Add debounced auto-save (2s after last change)

## 4. Collaborative Editing

- [ ] 4.1 Install @tiptap/extension-collaboration and @tiptap/extension-collaboration-cursor
- [ ] 4.2 Connect Tiptap editor to Hocuspocus via HocuspocusProvider
- [ ] 4.3 Implement cursor awareness with user name labels and colors
- [ ] 4.4 Handle connection/disconnection gracefully

## 5. Save Pipeline

- [ ] 5.1 Wire save chain: Y.js → tiptapToMarkdown → mergeFrontmatter → write .md file
- [ ] 5.2 Update content_hash in SQLite after save
- [ ] 5.3 Trigger FTS5 re-index after save
- [ ] 5.4 Handle save errors (retry with exponential backoff, notify user)

## 6. WebSocket (CrossWS) Setup

- [ ] 6.1 Configure Nitro experimental WebSocket with CrossWS
- [ ] 6.2 Create `/api/ws` endpoint with campaign-scoped room management
- [ ] 6.3 Implement message routing for presence and notification types
- [ ] 6.4 Add authentication on WebSocket upgrade (validate session)

## 7. Presence System

- [ ] 7.1 Implement server-side presence tracking (Map<campaignId, Set<user>>)
- [ ] 7.2 Handle presence:join / presence:leave / presence:list messages
- [ ] 7.3 Add 5s grace period on disconnect before removing user
- [ ] 7.4 Build presence avatar component for campaign header

## 8. Live Notifications

- [ ] 8.1 Emit WebSocket notifications from API mutation handlers
- [ ] 8.2 Create `useCampaignNotifications()` composable for client-side listening
- [ ] 8.3 Build toast notification component for live updates
- [ ] 8.4 Filter notifications by relevance (don't notify actor)

## 9. Tests (TDD)

### Unit Tests -- Service Functions

- [ ] 9.1 Test markdownToTiptap: headings, bold, lists → correct JSON
- [ ] 9.2 Test markdownToTiptap: entity-link MDC → correct node
- [ ] 9.3 Test tiptapToMarkdown: JSON → correct markdown
- [ ] 9.4 Test tiptapToMarkdown: entity-link node → MDC syntax
- [ ] 9.5 Test isRoundTripSafe: identical output after round-trip
- [ ] 9.6 Test secret block round-trip with role annotations
- [ ] 9.7 Test mergeFrontmatter: preserve unchanged, update changed, protect created_at
- [ ] 9.8 Test content hash: saving produces correct hash

### Integration Tests (API)

- [ ] 9.9 Test WebSocket auth: valid token connects, invalid rejected
- [ ] 9.10 Test WebSocket disconnect: presence:leave after grace period
- [ ] 9.11 Test save pipeline: edit → auto-save → .md file updated with correct content
- [ ] 9.12 Test FTS5 re-index after collab save: new terms searchable
- [ ] 9.13 Test Hocuspocus onAuthenticate: RBAC check (editor allowed, visitor rejected)
- [ ] 9.14 Test presence: two users connect → both in list → one disconnects → one remains

### E2E Tests (Playwright)

- [ ] 9.15 Test: open entity edit → Tiptap editor renders with existing content
- [ ] 9.16 Test: type in Tiptap editor → save → reload → content persisted
- [ ] 9.17 Test: entity-link autocomplete → type @ → see entity suggestions
- [ ] 9.18 Test: two browser contexts edit same entity → both see each other's cursors
- [ ] 9.19 Test: presence avatars show when another user is in the campaign

### Component Tests

- [ ] 9.20 Test MarkdownEditor: mounts with markdown, emits on edit
- [ ] 9.21 Test presence avatar: renders correct number of user avatars
- [ ] 9.22 Test toast notification: displays and auto-dismisses
