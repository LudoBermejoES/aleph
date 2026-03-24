# Tasks: Collaboration

## 1. Service Layer (`server/services/collaboration.ts`)

- [ ] 1.1 Implement `markdownToTiptap(md)` -- converts markdown to Tiptap JSON
- [ ] 1.2 Implement `tiptapToMarkdown(json)` -- converts Tiptap JSON back to markdown
- [ ] 1.3 Implement `mergeFrontmatter(existing, updated)` -- merges frontmatter preserving created date
- [ ] 1.4 Implement `isRoundTripSafe(markdown)` -- verifies markdown survives round-trip

## 2. Tiptap 3 Editor Integration

- [ ] 2.1 Install Tiptap 3 with StarterKit, Placeholder, Typography, Link, Image, Table extensions
- [ ] 2.2 Install and configure @tiptap/markdown for bidirectional serialization
- [ ] 2.3 Create `MarkdownEditor.vue` component wrapping Tiptap
- [ ] 2.4 Implement load flow using `markdownToTiptap` service: read .md → gray-matter parse → setContent
- [ ] 2.5 Build custom Tiptap node for `:entity-link` MDC component
- [ ] 2.6 Build custom Tiptap node for `::secret` block MDC component
- [ ] 2.7 Replace existing markdown textarea with MarkdownEditor on entity edit pages

## 3. Y.js + Hocuspocus Setup

- [ ] 3.1 Install @hocuspocus/server and configure as standalone process
- [ ] 3.2 Implement `onLoadDocument`: read .md file, parse via `markdownToTiptap` service, hydrate Y.js doc
- [ ] 3.3 Implement `onStoreDocument`: serialize Y.js via `tiptapToMarkdown` service → write .md file
- [ ] 3.4 Implement `onAuthenticate`: validate session token and check RBAC permissions
- [ ] 3.5 Configure document naming convention: `campaign:{id}:entity:{slug}`
- [ ] 3.6 Add debounced auto-save (2s after last change)

## 4. Collaborative Editing

- [ ] 4.1 Install @tiptap/extension-collaboration and @tiptap/extension-collaboration-cursor
- [ ] 4.2 Connect Tiptap editor to Hocuspocus via Y.js provider
- [ ] 4.3 Implement cursor awareness with user name labels and deterministic colors
- [ ] 4.4 Test multi-user concurrent editing and conflict resolution

## 5. Save Pipeline

- [ ] 5.1 Wire save chain: Y.js → `tiptapToMarkdown` service → `mergeFrontmatter` service → write .md file
- [ ] 5.2 Update content_hash in SQLite after save
- [ ] 5.3 Trigger FTS5 re-index after save
- [ ] 5.4 Handle save errors gracefully (retry, notify user)

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

- [ ] 8.1 Emit WebSocket notifications from API mutation handlers (entity CRUD, session status)
- [ ] 8.2 Create `useCampaignNotifications()` composable for client-side listening
- [ ] 8.3 Build toast notification component for live updates
- [ ] 8.4 Filter notifications by relevance (don't notify the user who made the change)

## 9. Tests (TDD)

### Unit Tests -- Service Functions (Vitest)

- [ ] 9.1 Test `isRoundTripSafe`: markdown round-trip (markdown → Tiptap JSON → markdown) produces identical output
- [ ] 9.2 Test `mergeFrontmatter`: existing frontmatter fields preserved when no changes made
- [ ] 9.3 Test `mergeFrontmatter`: changing a field updates that field; unchanged fields remain intact
- [ ] 9.4 Test `mergeFrontmatter`: created_at field is never overwritten even if updated payload includes it
- [ ] 9.5 Test `markdownToTiptap`: converts markdown with `:entity-link` MDC to correct Tiptap JSON node
- [ ] 9.6 Test `tiptapToMarkdown`: converts Tiptap JSON with entity-link node back to correct MDC syntax
- [ ] 9.7 Test `markdownToTiptap` + `tiptapToMarkdown`: `::secret` block with role/user annotations round-trips correctly
- [ ] 9.8 Test content hash computation: saving document produces content_hash matching new content

### Schema Tests (`:memory:` SQLite)

- [ ] 9.9 Test content_hash column on entities table: updated after save; non-null constraint

### Integration Tests (API)

- [ ] 9.10 Test WebSocket authentication: connection with valid session token succeeds; connection without token is rejected
- [ ] 9.11 Test WebSocket disconnection: client disconnect triggers presence:leave after grace period
- [ ] 9.12 Test save pipeline: Y.js doc change → auto-save writes .md file with correct content and frontmatter
- [ ] 9.13 Test FTS5 re-index after save: editing entity content updates search index; new terms are searchable
- [ ] 9.14 Test Hocuspocus onAuthenticate: user without edit permission on entity is rejected; user with permission is accepted
- [ ] 9.15 Test presence system: two users connect to same campaign room; presence:list returns both users; one disconnects → list returns one

### Component Tests

- [ ] 9.16 Test MarkdownEditor component: mounts with initial markdown content; emits update on edit
- [ ] 9.17 Test presence avatar component: renders correct number of user avatars for connected users
