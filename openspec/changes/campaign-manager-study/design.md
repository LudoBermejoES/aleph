# Design: Campaign Manager Study

## Technical Approach

### Recommended Tech Stack

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| **Runtime** | Node.js | 22.x LTS (latest) | User requirement; excellent ecosystem for real-time apps |
| **Frontend** | Vue.js 3 | 3.5+ (latest) | User requirement; Composition API, excellent reactivity |
| **Meta-framework** | Nuxt 3 | 3.15+ (latest) | SSR + API routes in one framework; Vue.js native; file-based routing; auto-imports; server middleware for API |
| **Database** | SQLite | via better-sqlite3 | User requirement; zero-config, self-hosted friendly, single-file DB |
| **ORM** | Drizzle ORM | latest | Type-safe, lightweight, excellent SQLite support, migration system |
| **Auth** | Lucia Auth or custom JWT | -- | Session-based auth with SQLite adapter; role/permission checks |
| **Real-time** | Socket.io or ws | -- | WebSocket layer for collaborative editing and live updates |
| **Rich Text Editor** | Tiptap (ProseMirror) | -- | Vue.js native, extensible, collaborative editing support, used by Kanka |
| **Maps** | Leaflet.js or OpenLayers | -- | Interactive maps with custom tile/image layers, pins, regions |
| **Search** | SQLite FTS5 | built-in | Full-text search built into SQLite; no external service needed |
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
│  │ Vue.js 3 │ │ Pinia    │ │ Socket.io    │ │
│  │ Pages    │ │ Store    │ │ Client       │ │
│  └──────────┘ └──────────┘ └──────────────┘ │
└──────────────────┬──────────────────────────┘
                   │ HTTP / WebSocket
┌──────────────────┴──────────────────────────┐
│              Nuxt 3 / Nitro Server           │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
│  │ API      │ │ Auth     │ │ WebSocket    │ │
│  │ Routes   │ │ Middleware│ │ Server       │ │
│  └──────────┘ └──────────┘ └──────────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
│  │ RBAC     │ │ Auto-Link│ │ Search       │ │
│  │ Engine   │ │ Engine   │ │ (FTS5)       │ │
│  └──────────┘ └──────────┘ └──────────────┘ │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────┴──────────────────────────┐
│          SQLite (better-sqlite3)             │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
│  │ Drizzle  │ │ FTS5     │ │ JSON         │ │
│  │ ORM      │ │ Index    │ │ Columns      │ │
│  └──────────┘ └──────────┘ └──────────────┘ │
└─────────────────────────────────────────────┘
```

### Key Architectural Decisions

1. **Entity-Attribute-Value (EAV) + JSON hybrid**: Core entity types (character, location, item, etc.) have fixed schema columns. Custom fields stored as JSON columns in SQLite. This balances queryability with flexibility.

2. **Auto-linking engine**: Background process that scans content for entity names/aliases and creates link records. Triggered on content save and on entity rename. Uses SQLite FTS5 for efficient name matching.

3. **Permission resolution**: Cascading permission model: System Role -> Campaign Role -> Entity-level override -> Field-level visibility. Cached per-session for performance.

4. **Content visibility**: Every content record has a `visibility` column (public, members, editors, dm_only, private). Query middleware automatically filters based on requesting user's resolved permissions.

5. **Collaborative editing**: Tiptap + Y.js for CRDT-based real-time editing. WebSocket transport via Socket.io. Awareness protocol shows cursors.

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
