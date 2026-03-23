# Design: Campaign Manager Study

## Technical Approach

### Recommended Tech Stack

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| **Runtime** | Node.js | 22.x LTS (latest) | User requirement; excellent ecosystem for real-time apps |
| **Frontend** | Vue.js 3 | 3.5+ (latest) | User requirement; Composition API, excellent reactivity |
| **Meta-framework** | Nuxt 3 | 3.15+ (latest) | SSR + API routes in one framework; Vue.js native; file-based routing; auto-imports; server middleware for API |
| **Database** | SQLite | via native node:sqlite | User requirement; zero-config, self-hosted friendly, single-file DB; native Node.js module (stable in Node 23.4+) |
| **ORM** | Drizzle ORM | latest | Type-safe, lightweight, SQLite support via node:sqlite adapter, migration system |
| **Auth** | Better Auth | latest | Session-based, SQLite-native, credential auth, CSRF, rate limiting (Lucia Auth is deprecated as of March 2025) |
| **Real-time (general)** | Nitro native WebSockets (CrossWS) | built-in | No extra dependencies; handles presence, notifications, dice rolls |
| **Real-time (collab editing)** | Hocuspocus (Y.js backend) | latest | MIT-licensed, self-hosted Y.js WebSocket server by Tiptap team; handles CRDT sync, persistence hooks |
| **Rich Text Editor** | Tiptap 3 + @tiptap/markdown | 3.20+ | Official MIT markdown extension (bidirectional); Vue 3 native; collaborative via Y.js |
| **Markdown Rendering** | @nuxtjs/mdc (standalone) | latest | Runtime MDC parsing + Vue component embedding in markdown; NOT Nuxt Content (which is build-time only) |
| **Markdown Parsing** | remark/rehype (via MDC) | latest | AST-based pipeline; custom plugins for auto-linking, secret block filtering |
| **Frontmatter Validation** | Zod | latest | TypeScript-native schema validation; used by Nuxt Content, Astro, Drizzle |
| **Maps** | Leaflet.js + Leaflet-Geoman | 1.9.4+ | CRS.Simple for custom images; Geoman for region/path drawing; tiling pipeline for images >4K px |
| **Search** | SQLite FTS5 | built-in | Full-text search with porter stemming; managed via raw SQL (Drizzle lacks FTS5 virtual table support) |
| **Filesystem Watching** | chokidar v5 | 5.x | Native OS APIs (FSEvents/inotify/ReadDirectoryChangesW); awaitWriteFinish debouncing |
| **Git Versioning** | isomorphic-git | latest | Pure JS git for optional content versioning; no native deps; server-side only |
| **Auto-Linking** | Aho-Corasick algorithm | custom impl | Single-pass multi-pattern matching; O(text length); handles 2000+ names/aliases per campaign |
| **CSS/UI** | Tailwind CSS + shadcn-vue | -- | Utility-first CSS with polished component library for Vue |

### Why Nuxt 3 over Express/Fastify

1. **Unified codebase**: Frontend + API in one project; Vue components and server routes coexist
2. **File-based routing**: Both pages and API endpoints defined by directory structure
3. **SSR out of the box**: Better SEO, faster initial load, progressive enhancement
4. **Auto-imports**: Vue composables, utilities, and components auto-imported
5. **Nitro server engine**: Deploys anywhere (Node, serverless, edge); built-in API layer
6. **Vue ecosystem first-class**: All Vue.js 3 features, Pinia for state, VueUse for utilities
7. **Self-hosting friendly**: Can deploy as a simple Node.js server

### Architecture Overview

```
┌─────────────────────────────────────────────┐
│                  Client (Browser)             │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
│  │ Vue.js 3 │ │ Pinia    │ │ WebSocket    │ │
│  │ Pages    │ │ Store    │ │ Client       │ │
│  └──────────┘ └──────────┘ └──────────────┘ │
└──────────────────┬──────────────────────────┘
                   │ HTTP / WebSocket
┌──────────────────┴──────────────────────────┐
│              Nuxt 3 / Nitro Server           │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
│  │ API      │ │ Better   │ │ CrossWS      │ │
│  │ Routes   │ │ Auth     │ │ WebSocket    │ │
│  └──────────┘ └──────────┘ └──────────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
│  │ RBAC     │ │ Auto-Link│ │ Hocuspocus   │ │
│  │ Engine   │ │ (Aho-C.) │ │ (Y.js sync)  │ │
│  └──────────┘ └──────────┘ └──────────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
│  │ MDC      │ │ chokidar │ │ Search       │ │
│  │ Renderer │ │ fs watch │ │ (FTS5)       │ │
│  └──────────┘ └──────────┘ └──────────────┘ │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────┴──────────────────────────┐
│         Hybrid Storage Layer                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
│  │ SQLite   │ │ FTS5     │ │ Filesystem   │ │
│  │ Drizzle  │ │ (raw SQL)│ │ .md + assets │ │
│  └──────────┘ └──────────┘ └──────────────┘ │
└─────────────────────────────────────────────┘
```

### Database Decision: SQLite (node:sqlite) over PGlite

PGlite (PostgreSQL 17.5 compiled to WASM, v0.4.x) was evaluated as an alternative to SQLite. While PGlite offers pg_trgm fuzzy matching, JSONB with GIN indexes, Postgres FTS with 30+ language support, and range types for calendars, the benchmarks are decisive:

| Metric | SQLite (node:sqlite) | PGlite (WASM) |
|--------|---------------------|---------------|
| 1000 SELECTs | 1.2ms | 266ms (222x slower) |
| 1000 INSERTs | 0.5ms | 276ms (552x slower) |
| 100 FTS searches | 16ms | 165ms (10x slower) |
| Memory (RSS) | 39 MB | 565 MB |
| Storage | Single `.db` file | 42MB+ directory |
| Concurrency | WAL mode (concurrent reads) | Single connection, serialized |
| npm deps | Zero (built into Node.js) | 23MB package |
| Stability | SQLite 3.51.2 (most deployed DB); node:sqlite RC | v0.4.x pre-stable |

SQLite via node:sqlite (Node.js 25.x bundles SQLite 3.51.2) provides FTS5, JSON functions, WAL mode, window functions, recursive CTEs, and a unique Session/changeset API useful for real-time sync. The pg_trgm fuzzy matching loss is mitigated by Aho-Corasick for auto-linking and fuse.js for search suggestions.

**Note on Drizzle + node:sqlite**: The `drizzle-orm/node-sqlite` driver has been merged (PR #5464) but is not yet released. Use `better-sqlite3` driver as a bridge until it ships.

### Key Architectural Decisions

1. **Markdown-first content storage**: All entity content (wiki entries, session logs, character descriptions, etc.) is stored as `.md` files on the filesystem, NOT in the database. SQLite stores only metadata (id, type, name, path, visibility, custom fields, relationships, timestamps). This means:
   - Content is human-readable and editable outside the app with any text editor
   - Campaigns are portable -- copy a folder to back up or migrate
   - Git-friendly -- campaigns can optionally be version-controlled
   - Files use YAML frontmatter for structured metadata
   - Vue renders markdown via @nuxtjs/mdc (standalone, NOT Nuxt Content which is build-time only)
   - Tiptap 3 edits markdown natively via official @tiptap/markdown extension (MIT, bidirectional)
   - Frontmatter validated with Zod schemas

2. **Hybrid storage split**:
   - **Filesystem (.md files)**: Entity content, session logs, descriptions -- anything narrative/textual
   - **SQLite**: Users, permissions, roles, entity metadata, relationships, tags, inventory records, calendar definitions, map pin coordinates, search index (FTS5)
   - **Filesystem (assets/)**: Map images, character portraits, uploaded files

3. **Auto-linking engine**: Uses Aho-Corasick algorithm for single-pass, case-insensitive, multi-pattern matching across entity names and aliases. FTS5 narrows candidate documents for retroactive linking. Exclusion zones (code blocks, existing links, frontmatter, headings) are pre-computed. Longest match wins. Automaton cached per-campaign in memory.

4. **Permission resolution**: Cascading permission model: System Role -> Campaign Role -> Entity-level override -> Field-level visibility. Cached per-session for performance.

5. **Content visibility**: Entity metadata in SQLite has a `visibility` column (public, members, editors, dm_only, private). The server reads the `.md` file, parses to AST via remark, strips `:::secret` directive nodes based on user role, then serves filtered AST to MDCRenderer. Secret content never reaches unauthorized clients (server-side AST filtering, not client-side v-if).

6. **Filesystem watching**: Server uses chokidar to watch the content directory. External edits to `.md` files trigger re-indexing of metadata, search index, and auto-links -- enabling a workflow where DMs can bulk-edit content in VS Code or Obsidian.

7. **Collaborative editing**: Tiptap + Y.js for CRDT-based real-time editing. Hocuspocus handles Y.js document sync via WebSocket. On save (via Hocuspocus `onStoreDocument` hook), the Y.js state is extracted as Tiptap JSON, serialized to markdown via `@tiptap/markdown`, merged with preserved frontmatter (gray-matter), and written to the `.md` file.

8. **FTS5 management**: Drizzle ORM lacks native FTS5 virtual table support. FTS5 tables are created via raw SQL in migration files. Queries use `db.run(sql\`...\`)`. Content hash-based incremental indexing avoids re-processing unchanged files. Porter stemming + unicode61 tokenizer for multilingual support.

9. **Permission resolution**: Three-tier cascade: entity-level user override > entity-level role override > campaign role default. In-memory LRU cache per-user with 5-min TTL. List queries use a single SQL query with LEFT JOINs on permission tables for filtering. Named permissions (QuestKeeper, Chronicler, etc.) stored as grants on campaign_members.

### Data Model Concepts

**Core entities**: User, Campaign, CampaignMember, Role, Permission, Entity (polymorphic), EntityTemplate, EntityField, EntityRelation, Map, MapPin, MapLayer, Session, SessionLog, Calendar, CalendarEvent, Timeline, TimelineEvent, InventoryItem, Shop, DiceRoll, Tag, EntityTag

**Key relationships**:
- User -> many CampaignMembers -> Campaign (with Role)
- Campaign -> many Entities (wiki entries of various types)
- Entity -> many EntityFields (custom properties)
- Entity -> many EntityRelations (bidirectional connections)
- Entity -> many Tags
- Map -> many MapPins -> optional Entity link
- Campaign -> many Sessions -> many SessionLogs
- Campaign -> many Calendars -> many CalendarEvents
