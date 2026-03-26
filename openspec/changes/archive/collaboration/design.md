# Design: Collaboration

## Technical Approach

### Tiptap 3 Editor

- Tiptap 3 with core extensions: StarterKit, Placeholder, Typography, Link, Image, Table
- `@tiptap/markdown` extension for bidirectional serialization
- On editor mount: load `.md` file → parse with gray-matter → feed body to `editor.commands.setContent(markdown)`
- Custom extensions for MDC components: `:entity-link`, `::secret` block

### Y.js + Hocuspocus

- **Hocuspocus** runs as a standalone process (or embedded in the Nitro server via a plugin)
- Each entity document gets a Y.js document keyed by `campaign:{campaignId}:entity:{entitySlug}`
- Hocuspocus `onLoadDocument`: read `.md` file, parse markdown, hydrate Y.js doc
- Hocuspocus `onStoreDocument`: triggered on debounced intervals (2s after last change)
- Authentication: Hocuspocus `onAuthenticate` validates the user's session token and RBAC permissions

### Cursor Awareness

- Y.js awareness protocol broadcasts cursor position + user metadata (name, color)
- Tiptap `@tiptap/extension-collaboration-cursor` renders colored cursors with name labels
- User color assigned deterministically from user ID (hash to HSL hue)

### Save Pipeline

```
Y.js document state
  → Tiptap getJSON()
  → @tiptap/markdown serialize to markdown string
  → gray-matter.stringify(markdownBody, existingFrontmatter)
  → write to content/campaigns/{slug}/entities/{type}/{slug}.md
  → update content_hash in SQLite entities table
  → trigger FTS5 re-index
```

Frontmatter is preserved across saves -- the save pipeline reads the existing frontmatter, merges any editor-triggered metadata changes, and writes the combined result.

### WebSocket (CrossWS)

- Nitro experimental WebSocket via CrossWS for non-collaborative events
- Endpoint: `/api/ws` -- single multiplexed WebSocket per client
- Message types:
  - `presence:join` / `presence:leave` / `presence:list`
  - `notify:entity:created` / `notify:entity:updated` / `notify:entity:deleted`
  - `notify:session:status_changed`
- Server-side: campaign-scoped rooms. Clients join a room on campaign open, leave on navigate away.

### Presence Indicators

- On campaign page load, client sends `presence:join { campaignId, userId, userName }`
- Server maintains `Map<campaignId, Set<{ userId, userName, connectedAt }>>` in memory
- Presence list rendered as avatar circles in the campaign header
- On WebSocket disconnect, server removes user from presence after 5s grace period

### Live Notifications

- Server API handlers emit WebSocket messages after successful mutations
- Client-side composable `useCampaignNotifications()` listens and displays toast notifications
- Notifications are ephemeral (not persisted) -- they appear only for currently connected users

### Service Layer (TDD)

Business logic extracted into `server/services/collaboration.ts` -- pure functions tested in isolation:

- `markdownToTiptap(md)` -- converts markdown to Tiptap JSON
- `tiptapToMarkdown(json)` -- converts Tiptap JSON back to markdown
- `mergeFrontmatter(existing, updated)` -- merges frontmatter preserving created date
- `isRoundTripSafe(markdown)` -- verifies markdown survives round-trip

Architecture: Write unit tests first (TDD red phase), then implement service functions (green phase), then refactor API handlers to call services. API handlers stay thin -- they call services + DB, return results.

Test layers:
1. **Unit tests**: service functions in isolation (no DB, no server)
2. **Schema tests**: DB constraints and cascades (`:memory:` SQLite)
3. **Integration tests**: API contracts against running server

### API / WebSocket Endpoints

```
WebSocket: /api/ws
POST      /api/campaigns/:id/collab/token    # generate Hocuspocus auth token
```

Hocuspocus runs on its own port (default 1234) or behind a reverse proxy path.
