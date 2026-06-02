# Architecture

This is the system map. Read it first; the other docs drill into each box.

## The shape of the thing

Aleph is a **Nuxt 4 application in SPA mode** (`ssr: false`). That one decision explains a lot: the browser is a thin client, and almost all logic lives in the **Nitro server** that Nuxt bundles. There is no SSR to reason about — pages render client-side and talk to the server over a REST-ish API plus two WebSocket channels.

```
┌─────────────────────────────────────────────────────────────┐
│ Browser (Vue 3 SPA)                                          │
│   pages/ + components/ + composables/                        │
│   ├─ Tiptap editor  ──► WebSocket :3334 (Hocuspocus/Yjs)     │
│   ├─ tldraw canvas  ──► WebSocket /api/tldraw-sync (React)   │
│   └─ everything else ─► HTTP  /api/*                          │
└───────────────┬─────────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────────┐
│ Nitro server (server/)                                       │
│   middleware/01.auth.ts   cookie session OR X-API-Key        │
│   api/*                   REST endpoints (the bulk)          │
│   plugins/hocuspocus.ts   collab server on :3334             │
│   routes/api/tldraw-sync  diagram sync WebSocket             │
│   services/*              the actual business logic          │
└───────┬───────────────────────────────┬─────────────────────┘
        │                                │
┌───────▼─────────┐            ┌─────────▼──────────┐
│ SQLite (data/)  │            │ Markdown (content/)│
│ Drizzle ORM     │            │ one file / entity  │
│ metadata, FTS5, │◄──hash────►│ frontmatter + body │
│ relations, econ │  in sync   │ human-readable     │
└─────────────────┘            └────────────────────┘
```

## The two-store content model

The single most important idea in Aleph: **a wiki entity is both a Markdown file and a database row, and they are kept in sync.**

- The **Markdown file** (`content/campaigns/<slug>/<type>/<slug>.md`) is the source of truth for _content_: the prose, the frontmatter (name, aliases, tags, visibility, template, custom fields).
- The **database row** (`entities` table) is the source of truth for _metadata and indexing_: campaign scoping, permissions, the file path, a content hash, and the FTS5 search index.

When content changes (via the editor or the API), the server writes the file, recomputes the content hash, updates the row, and re-indexes the entity for search — in one flow. This is why you get git-friendly plain-text storage _and_ fast permission-scoped queries. Full detail in [content-model.md](content-model.md).

## The three transport channels

1. **HTTP `/api/*`** — the default. CRUD for every domain, all guarded by `server/middleware/01.auth.ts`. This is also exactly what the [CLI](cli.md) uses.
2. **Hocuspocus WebSocket (`:3334`)** — real-time collaborative editing of wiki/session/quest prose. Documents are named `campaign:<id>:<type>:<slug>`. See [collaboration.md](collaboration.md).
3. **tldraw sync WebSocket (`/api/tldraw-sync/<diagramId>`)** — real-time multiplayer for the diagram canvas. See [diagrams.md](diagrams.md).

They are separate on purpose: prose and freeform canvas have different data models (a ProseMirror/Yjs document vs. a tldraw store), different schemas, and different persistence strategies.

## Authentication, in one sentence

Every non-auth, non-health request passes through `server/middleware/01.auth.ts`, which accepts **either** a browser cookie session (better-auth) **or** an `X-API-Key` header (CLI/automation), and attaches the resolved user to `event.context`. Details and the role model in [auth.md](auth.md).

## Where the surprises are

Three parts of Aleph are more involved than a typical Nuxt CRUD app, and each has its own doc:

- **React inside Nuxt.** tldraw is a React library; Aleph is Vue. `nuxt.config.ts` defines a custom module that strips Nuxt's `vue-jsx` plugin so `@vitejs/plugin-react-swc` can own `.tsx` files, and injects the React Fast Refresh preamble by hand (Nitro bypasses Vite's HTML transform). See [diagrams.md](diagrams.md).
- **The Markdown↔Tiptap↔Yjs pipeline.** Collaborative editing speaks Yjs, the wire format is ProseMirror JSON, and the storage format is Markdown. The server runs a headless Tiptap editor (under jsdom) to convert losslessly between them. See [collaboration.md](collaboration.md).
- **Autolinking with exclusion zones.** Turning entity names into links in arbitrary Markdown without corrupting code blocks, headings, existing links, or frontmatter is harder than it looks. See [autolink.md](autolink.md).

## Project layout

```
app/                Vue SPA — pages, components, composables, layouts, assets, Tiptap extensions
server/
  api/              REST endpoints (campaigns, entities, characters, sessions, maps, admin, …)
  middleware/       01.auth.ts — session + API-key auth
  plugins/          hocuspocus.ts — collab server on :3334
  routes/           tldraw-sync WebSocket, ws token
  services/         business logic (autolink, content, collaboration, search, tldraw-rooms, …)
  db/schema/        Drizzle table definitions  →  db/migrations/ generated SQL
  tasks/            scheduled jobs (daily R2 backup, map tiling)
cli/                the standalone `aleph` CLI (Node + Commander)
i18n/locales/       en.json / es.json — the ONLY locale dir that loads (see development.md)
content/            runtime: per-entity Markdown files
data/               runtime: aleph.db (SQLite)
tests/              unit/ (Vitest) · integration/ (Vitest+server) · e2e/ (Playwright)
openspec/           spec-driven-development workflow (proposals, specs, changes)
docs/               you are here
```

## Database schema, at a glance

Tables are grouped by domain under `server/db/schema/`:

| File                                                      | Owns                                                       |
| --------------------------------------------------------- | ---------------------------------------------------------- |
| `auth.ts`                                                 | users, API keys                                            |
| `campaigns.ts`, `campaign-members.ts`                     | campaigns and membership/roles                             |
| `entities.ts`, `entity-types.ts`                          | wiki entities, custom types, templates, tags               |
| `characters.ts`                                           | characters, stat groups, abilities, connections, folders   |
| `relations.ts`                                            | the relationship graph + family links                      |
| `sessions.ts`                                             | sessions, attendance, quests, decisions, arcs, chapters    |
| `diagrams.ts`                                             | diagrams and their snapshots                               |
| `maps.ts`                                                 | maps, pins, layers, groups, regions                        |
| `inventory.ts`                                            | items, currencies, shops, stock, inventories, transactions |
| `organizations.ts`                                        | organizations, members, locations                          |
| `calendars.ts`                                            | calendars and events                                       |
| `mentions.ts`, `secrets.ts`, `permissions.ts`, `rolls.ts` | cross-cutting metadata                                     |

See [content-model.md](content-model.md) for how the entity tables relate to the files on disk.
