# Tasks: Collaboration

## 1. Tiptap 3 Editor Integration

- [ ] 1.1 Install Tiptap 3 with StarterKit, Placeholder, Typography, Link, Image, Table extensions
- [ ] 1.2 Install and configure @tiptap/markdown for bidirectional serialization
- [ ] 1.3 Create `MarkdownEditor.vue` component wrapping Tiptap
- [ ] 1.4 Implement load flow: read .md → gray-matter parse → setContent(markdown)
- [ ] 1.5 Build custom Tiptap node for `:entity-link` MDC component
- [ ] 1.6 Build custom Tiptap node for `::secret` block MDC component
- [ ] 1.7 Replace existing markdown textarea with MarkdownEditor on entity edit pages

## 2. Y.js + Hocuspocus Setup

- [ ] 2.1 Install @hocuspocus/server and configure as standalone process
- [ ] 2.2 Implement `onLoadDocument`: read .md file, parse, hydrate Y.js doc
- [ ] 2.3 Implement `onStoreDocument`: serialize Y.js → markdown → write .md file
- [ ] 2.4 Implement `onAuthenticate`: validate session token and check RBAC permissions
- [ ] 2.5 Configure document naming convention: `campaign:{id}:entity:{slug}`
- [ ] 2.6 Add debounced auto-save (2s after last change)

## 3. Collaborative Editing

- [ ] 3.1 Install @tiptap/extension-collaboration and @tiptap/extension-collaboration-cursor
- [ ] 3.2 Connect Tiptap editor to Hocuspocus via Y.js provider
- [ ] 3.3 Implement cursor awareness with user name labels and deterministic colors
- [ ] 3.4 Test multi-user concurrent editing and conflict resolution

## 4. Save Pipeline

- [ ] 4.1 Implement Y.js → Tiptap JSON → markdown serialization chain
- [ ] 4.2 Implement frontmatter merge (preserve existing frontmatter, update changed fields)
- [ ] 4.3 Update content_hash in SQLite after save
- [ ] 4.4 Trigger FTS5 re-index after save
- [ ] 4.5 Handle save errors gracefully (retry, notify user)

## 5. WebSocket (CrossWS) Setup

- [ ] 5.1 Configure Nitro experimental WebSocket with CrossWS
- [ ] 5.2 Create `/api/ws` endpoint with campaign-scoped room management
- [ ] 5.3 Implement message routing for presence and notification types
- [ ] 5.4 Add authentication on WebSocket upgrade (validate session)

## 6. Presence System

- [ ] 6.1 Implement server-side presence tracking (Map<campaignId, Set<user>>)
- [ ] 6.2 Handle presence:join / presence:leave / presence:list messages
- [ ] 6.3 Add 5s grace period on disconnect before removing user
- [ ] 6.4 Build presence avatar component for campaign header

## 7. Live Notifications

- [ ] 7.1 Emit WebSocket notifications from API mutation handlers (entity CRUD, session status)
- [ ] 7.2 Create `useCampaignNotifications()` composable for client-side listening
- [ ] 7.3 Build toast notification component for live updates
- [ ] 7.4 Filter notifications by relevance (don't notify the user who made the change)
