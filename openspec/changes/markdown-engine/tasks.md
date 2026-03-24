# Tasks: Markdown Content Engine

## 1. File Operations Service

- [x] 1.1 Create `server/services/content.ts`: readEntityFile, writeEntityFile, deleteEntityFile
- [x] 1.2 Implement gray-matter frontmatter parsing and serialization
- [x] 1.3 Create Zod schemas for entity frontmatter (base + per-type extensions)
- [x] 1.4 Implement content hash (MD5) for change detection
- [x] 1.5 Create campaign directory management: createCampaignDir, ensureTypeDir
- [x] 1.6 Implement slug generation and file path resolution

## 2. MDC Rendering

- [x] 2.1 Configure @nuxtjs/mdc in nuxt.config.ts
- [x] 2.2 Create `components/mdc/SecretBlock.vue`: renders secret content (client-side fallback)
- [x] 2.3 Create `components/mdc/EntityLink.vue`: renders inline entity references
- [x] 2.4 Create `app/components/MarkdownViewer.vue`: wraps MDCRenderer with loading state
- [x] 2.5 Create API endpoint to serve parsed + permission-filtered markdown

## 3. Secret Block Filtering

- [x] 3.1 Install remark-directive
- [x] 3.2 Create custom remark plugin `remarkStripSecrets(userRole, userId)`
- [x] 3.3 Handle `:::secret dm` (DM-only blocks)
- [x] 3.4 Handle `:::secret player:username1,username2` (user-specific blocks)
- [x] 3.5 Test: verify secret content never appears in API response for unauthorized users

## 4. Filesystem Watcher

- [x] 4.1 Install chokidar v5
- [x] 4.2 Create `server/services/watcher.ts`: watch content directory for .md file changes
- [x] 4.3 Implement debounced batch processing (1s debounce window)
- [x] 4.4 On file add: parse frontmatter, create/update entity metadata in SQLite, index in FTS5
- [x] 4.5 On file change: compare content hash, re-index if changed
- [x] 4.6 On file delete: remove entity metadata and FTS5 entry
- [x] 4.7 Start watcher on Nitro server startup via plugin
- [x] 4.8 Initial scan on startup: sync all .md files to database

## 5. FTS5 Search Index

- [x] 5.1 Create FTS5 migration: entities_fts virtual table + content shadow table + triggers
- [x] 5.2 Create `server/services/search.ts`: indexEntity, removeEntity, searchEntities
- [x] 5.3 Implement incremental indexing (content hash comparison, skip unchanged)
- [x] 5.4 Create `GET /api/campaigns/:id/search?q=`: search with BM25 ranking + snippets
- [x] 5.5 Add permission filtering to search results (exclude entities user cannot see)
- [x] 5.6 Create search UI component with instant results dropdown (Ctrl+K)

## 6. Tests (TDD)

### Unit Tests (Vitest)

- [x] 6.1 Test frontmatter parsing: valid YAML frontmatter extracts correct key-value pairs
- [x] 6.2 Test frontmatter validation: Zod schema rejects missing required fields, accepts valid entity frontmatter
- [x] 6.3 Test frontmatter serialization: round-trip parse → serialize produces identical output
- [x] 6.4 Test slug generation: converts "The Lost Temple" to "the-lost-temple"; handles unicode and special characters
- [x] 6.5 Test content hash: identical content produces same hash; different content produces different hash
- [x] 6.6 Test `remarkStripSecrets` plugin: `:::secret dm` block removed for player role, preserved for DM role
- [x] 6.7 Test `remarkStripSecrets` plugin: `:::secret player:alice` block visible to alice, hidden from bob
- [x] 6.8 Test `remarkStripSecrets` plugin: non-secret content passes through unmodified
- [x] 6.9 Test file CRUD operations (temp dir): writeEntityFile creates file with frontmatter + body; readEntityFile returns parsed result; deleteEntityFile removes file

### Integration Tests (@nuxt/test-utils)

- [x] 6.10 Test `GET /api/campaigns/:id/search?q=`: returns matching entities ranked by BM25 relevance
- [ ] 6.11 Test search results exclude entities the requesting user cannot see (permission filtering)
- [ ] 6.12 Test markdown render endpoint: secret blocks stripped from response for unauthorized user
- [ ] 6.13 Test markdown render endpoint: DM receives full content including secret blocks

### Filesystem Watcher Tests (Vitest, temp dir)

- [ ] 6.14 Test watcher detects new .md file: entity metadata row created in :memory: SQLite, FTS5 entry indexed
- [ ] 6.15 Test watcher detects file change: updated content hash triggers re-index; unchanged hash skips re-index
- [ ] 6.16 Test watcher detects file delete: entity metadata and FTS5 entry removed
- [x] 6.17 Test FTS5 search ranking: exact title match ranks higher than body mention
