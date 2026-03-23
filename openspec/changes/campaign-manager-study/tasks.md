# Tasks: Campaign Manager Study

## 1. Competitive Feature Analysis

- [x] 1.1 Build a comprehensive feature matrix comparing all 10+ tools across every feature domain (wiki, maps, calendar, sessions, characters, inventory, permissions, search, collaboration, import/export, theming)
- [x] 1.2 Identify the "best in class" implementation for each feature domain and document why
- [x] 1.3 Identify the critical gaps and pain points across all tools (from user reviews, blog posts, and community feedback)
- [x] 1.4 Document the auto-linking approaches: Kanka (@mentions + bracket syntax), World Anvil (autolinker), LegendKeeper (auto-linking + hover previews), Scabard (proper noun detection) -- compare strengths and feasibility for our stack

## 2. Worldbuilding Wiki Research

- [x] 2.1 Study Kanka's entity type system (20+ types, custom modules, properties with 6 field types, cross-references, math operations)
- [x] 2.2 Study Amsel Lore's template/rune system (drag-and-drop builder, 5 rune types, mirror links, grimoire)
- [x] 2.3 Study LegendKeeper's wiki (infinite nesting, slash commands, cut-to-new-page, hover previews, transclusion)
- [x] 2.4 Study World Anvil's article templates (28+ types, BBCode, custom templates with Twig/HTML/CSS)
- [x] 2.5 Define the entity type catalog for Aleph: which types are built-in, which are user-creatable
- [x] 2.6 Define the custom field/property system (field types, templates, inheritance, cross-references)
- [x] 2.7 Research Tiptap editor capabilities and extensibility for our wiki needs (mentions, embeds, transclusion, collaborative editing)

**Findings:** Tiptap 3 has official MIT @tiptap/markdown extension with bidirectional serialization. Custom nodes can define renderMarkdown handlers for secret blocks and entity mentions. Y.js collaboration via @tiptap/extension-collaboration + Hocuspocus backend.

## 3. Map System Research

- [x] 3.1 Study LegendKeeper's Atlas (14K px maps, regions, paths, travel calc, zoom-level visibility, distance measurement, fantasy navigation)
- [x] 3.2 Study Kanka's map system (layers, marker types, groups, explore mode, permission-controlled pins)
- [x] 3.3 Evaluate Leaflet.js vs OpenLayers for custom image-based maps with pins, layers, and regions
- [x] 3.4 Research nested map navigation patterns and breadcrumb implementations
- [x] 3.5 Define map feature requirements: pin types, layer system, visibility controls, distance/travel tools

**Findings:** Leaflet.js with CRS.Simple confirmed. Images >4K px require tiling (gdal2tiles). Leaflet-Geoman recommended over Leaflet.draw for region/path drawing. leaflet-rastercoords for pixel coordinate mapping. @vue-leaflet/vue-leaflet for Vue 3 integration.

## 4. Campaign and Session Management Research

- [x] 4.1 Study Amsel Tome's story structure (Arcs > Chapters > Scenes, non-linear branching, State tracking)
- [x] 4.2 Study Amsel Tome's Arcana system (Choice, Role, Count, Destiny tracking)
- [x] 4.3 Study Chronica's adventure notes and quest log (folders, nesting, visibility, quest chains, secret quests)
- [x] 4.4 Study Obsidian Portal's adventure log and session journal system
- [x] 4.5 Study Campaign Logger's rapid tagging system (@NPCs, #Locations, ~Plots, $Items)
- [x] 4.6 Define session management workflow: scheduling, logging, recap, player contributions
- [x] 4.7 Define quest/story tracking model: linear vs branching, decision tracking, consequence linking

## 5. Character Management Research

- [x] 5.1 Study Kanka's character system (properties, articles, connections, abilities, inventory, age calculation)
- [x] 5.2 Study Chronica's stat groups and abilities system (custom stats, secret/private, stat lock, profile templates)
- [x] 5.3 Study World Anvil's interactive character sheets and statblock system (100+ RPG systems, rollable stats)
- [x] 5.4 Study LegendKeeper's meter system (bars, circles, gauges, pools, ratings)
- [x] 5.5 Define character profile structure: fixed fields vs custom properties, stat tracking approach
- [x] 5.6 Define NPC management workflow: codex, secrets, encounter linking, relationship tracking

## 6. Calendar and Timeline Research

- [x] 6.1 Study Kanka's calendar (custom months, moons, seasons, weather, intercalary months, recurring events, age calculation)
- [x] 6.2 Study LegendKeeper's timeline (chronicle view, Gantt view, calendar view, custom calendar systems, moon phases)
- [x] 6.3 Study Chronica's developments timeline and custom calendar (moon phases, seasons, recurring events)
- [x] 6.4 Define custom calendar data model: months, weekdays, years, moons, seasons, intercalary periods
- [x] 6.5 Define timeline visualization requirements: views, event linking, parallel storylines

## 7. Inventory and Economy Research

- [x] 7.1 Study Chronica's inventory system (personal + party, containers, weight, shops, currencies, wealth logs, player shopkeeper)
- [x] 7.2 Study Kanka's inventory system (positions, grid layout, weight/size/price, on any entity type)
- [x] 7.3 Define inventory data model: items, containers, positions, transactions, currencies
- [x] 7.4 Define shop system requirements: browsing, purchasing, player-owned shops, stock management

## 8. Role-Based Access Control Research

- [x] 8.1 Study Kanka's permission system in depth (role-based + entity-level overrides, 5 visibility levels, permission chaining, inline permissions)
- [x] 8.2 Study Chronica's player permissions and named admin roles (CharacterCodexer, KinshipKeeper, QuestKeeper, etc.)
- [x] 8.3 Study LegendKeeper's secrets system and granular visibility settings
- [x] 8.4 Study World Anvil's subscriber groups and secret/spoiler system
- [x] 8.5 Define role hierarchy: Admin > Dungeon Master > Co-DM > Editor > Player > Visitor
- [x] 8.6 Define permission granularity levels: system-wide, campaign-wide, entity-level, field-level
- [x] 8.7 Define visibility model: public, members, editors, dm-only, specific-users, private
- [x] 8.8 Define permission inheritance and override rules
- [x] 8.9 Research and define additional granular permission roles (QuestKeeper, Cartographer, Chronicler, etc.)

**Findings:** Three-tier cascade: entity-level user override > entity-level role override > campaign role default. `entity_permissions` table with user/role target + allow/deny effect. List filtering via single SQL query with LEFT JOINs. In-memory LRU cache per-user (5-min TTL). Named permissions as grants on campaign_members table.

## 9. Markdown-First Content Architecture Research

- [x] 9.1 Research Nuxt Content module: how it reads .md files from filesystem, YAML frontmatter parsing, Vue component embedding in markdown, query API, and hot-reload on file changes
- [x] 9.2 Research @nuxtjs/mdc (Markdown Components): rendering markdown with Vue components inline (e.g., embedded maps, dice rollers, meters inside .md files)
- [x] 9.3 Evaluate markdown-it vs unified/remark vs @nuxtjs/mdc as the markdown parsing pipeline -- extensibility for custom syntax (auto-linking, entity mentions, secret blocks)
- [x] 9.4 Research Tiptap's markdown serialization: can Tiptap edit markdown as source format and serialize back to .md on save (vs operating on HTML/JSON internally)?
- [x] 9.5 Research filesystem watching in Node.js/Nuxt: chokidar or fs.watch for detecting external edits to .md files and triggering re-indexing
- [x] 9.6 Design the YAML frontmatter schema for entity files: which metadata goes in frontmatter (type, name, aliases, tags, visibility, custom fields) vs in the database only
- [x] 9.7 Design the campaign directory structure convention: folder hierarchy per entity type, naming conventions, asset co-location (images next to .md files vs centralized)
- [x] 9.8 Research how to handle permission-filtered rendering: stripping secret/DM-only sections from markdown before serving to unauthorized users (frontmatter visibility + inline secret blocks)
- [x] 9.9 Research git integration potential: since content is files, campaigns could be versioned with git -- evaluate feasibility and UX implications
- [x] 9.10 Evaluate SQLite FTS5 indexing of markdown file content: how to keep the search index in sync with filesystem changes, incremental re-indexing strategy
- [x] 9.11 Research how Obsidian (the note app) and similar tools handle markdown + metadata split -- lessons learned for our architecture

**Critical finding:** Nuxt Content v3 is NOT suitable -- it's a build-time system that cannot discover campaigns/files created at runtime. Use @nuxtjs/mdc standalone instead (runtime parsing + Vue component rendering without the static content pipeline).

**Findings:** @tiptap/markdown (official, MIT, v3.7+) handles bidirectional markdown serialization. gray-matter for frontmatter separation. chokidar v5 for filesystem watching. Zod for frontmatter schema validation. Server-side AST stripping via remark plugins for secret blocks (never send secrets to browser). isomorphic-git viable for optional versioning. FTS5 with external content tables + content hash-based incremental indexing.

## 10. Tech Stack Validation

- [x] 10.1 Validate Nuxt 3 as the meta-framework: evaluate file-based API routing, middleware, SQLite compatibility, WebSocket support
- [x] 10.2 Evaluate Drizzle ORM with SQLite: migration system, type safety, JSON column support, FTS5 integration
- [x] 10.3 Evaluate Tiptap + Y.js for collaborative rich text editing in Vue 3
- [x] 10.4 Evaluate Leaflet.js with custom image layers for the map system
- [x] 10.5 Evaluate SQLite FTS5 for full-text search performance with expected data volumes
- [x] 10.6 Evaluate authentication approaches: Lucia Auth vs custom JWT vs Nuxt Auth Utils
- [x] 10.7 Evaluate real-time sync options: Socket.io vs native WebSocket vs Nuxt WebSocket module
- [x] 10.8 Prototype: basic Nuxt 3 + SQLite + Drizzle + markdown file reading to validate the core stack works end-to-end
- [x] 10.9 Evaluate PGlite vs SQLite: benchmark performance, FTS, concurrency, memory, operational simplicity

**Key decisions from research:**

- **Database: SQLite via node:sqlite** (PGlite evaluated and rejected -- 222x slower queries, 14x more memory, v0.4 pre-stable, single-connection limitation). Node.js 25.x bundles SQLite 3.51.2 with FTS5, JSON, WAL, Session/changeset API. Drizzle node-sqlite driver merged but unreleased -- use better-sqlite3 driver as bridge.
- **Auth: Better Auth** (Lucia Auth deprecated March 2025). SQLite-native, credential auth, session management, CSRF, rate limiting. Dedicated Nuxt module (nuxt-better-auth).
- **Real-time: Nitro native WebSockets (CrossWS)** for general events + **Hocuspocus** for Y.js collaborative editing. No Socket.io dependency needed.
- **Drizzle + FTS5**: Drizzle lacks native FTS5 virtual table support. FTS5 tables managed via raw SQL in migrations. Queries via `db.run(sql`...`)`.
- **Leaflet.js confirmed**: CRS.Simple for custom images. Leaflet-Geoman for drawing. Tiling required for images >4K px.
- **Node.js 25.x**: Full compatibility with all stack components. node:sqlite is RC stability with SQLite 3.51.2.

## 11. Data Model Design

- [x] 11.1 Design the User and Authentication schema (users, sessions, password hashes, 2FA)
- [x] 11.2 Design the Campaign and Membership schema (campaigns, members, roles, invitations)
- [x] 11.3 Design the Entity system schema (polymorphic entities, templates, custom fields, tags, relations) -- metadata only, content lives in .md files
- [x] 11.4 Design the Map schema (maps, layers, pins, groups, nested maps)
- [x] 11.5 Design the Session and Story schema (sessions, logs, arcs, scenes, decisions)
- [x] 11.6 Design the Calendar and Timeline schema (calendars, months, events, timelines)
- [x] 11.7 Design the Inventory and Economy schema (items, inventories, shops, currencies, transactions)
- [x] 11.8 Design the Permission schema (roles, permissions, entity-level overrides, visibility)
- [x] 11.9 Design the Search index schema (FTS5 virtual tables, trigram index for auto-linking, synced from .md file content)

**Findings:** Full data model spec created at `specs/data-model/spec.md`. ~30 tables covering all domains. Key design decisions: single-row bidirectional relations with forward/reverse labels, JSON columns for flexible calendar dates and multi-currency pricing, FTS5 with content shadow table and triggers for sync, entity_permissions with user/role target + allow/deny effect.

## 12. Collaboration and Real-Time Research

- [x] 12.1 Study LegendKeeper's real-time co-editing (multiplayer cursors, conflict resolution)
- [x] 12.2 Research Y.js CRDT for collaborative editing with Tiptap over markdown files
- [x] 12.3 Define which features need real-time sync vs eventual consistency
- [x] 12.4 Design WebSocket event model for live updates (entity changes, map pin moves, dice rolls, session state)

**Findings:** Hocuspocus (MIT, by Tiptap team) handles Y.js sync with persistence hooks. On save: Y.js state -> Tiptap JSON -> @tiptap/markdown serialize -> merge with frontmatter (gray-matter) -> write .md file. Nitro native WebSockets (CrossWS) for non-collab events (presence, notifications, dice). No Socket.io needed.

## 13. Differentiation and Unique Features

- [x] 13.1 Define the auto-linking engine specification: entity detection, alias support, case-insensitivity, retroactive linking, performance requirements
- [x] 13.2 Define the "relationship graph" feature: bidirectional connections, visual graph view, connection types
- [x] 13.3 Define the decision/consequence tracking system (inspired by Amsel Tome's Arcana)
- [x] 13.4 Define the self-hosting story: single binary/Docker, zero-config SQLite, easy backup (copy the content folder + one .db file)
- [x] 13.5 Identify 3-5 differentiating features that no single existing tool provides in combination

**Findings (auto-linking):** Aho-Corasick algorithm for single-pass multi-pattern matching. O(text length) regardless of pattern count. Case-insensitive via lowercased patterns. Longest match wins. Exclusion zones pre-computed (code blocks, existing links, frontmatter, headings). FTS5 for candidate document narrowing during retroactive linking. Automaton cached per-campaign in memory (<1MB, <10ms rebuild). Hybrid processing: synchronous for <20 docs, background queue for larger batches.

**Findings (relationship graph):** Full spec at `specs/relationship-graph/spec.md`. Single-row bidirectional storage with forward/reverse labels. 17 built-in relation types + custom. Attitude scores (-100 to +100) for edge coloring. v-network-graph (Vue 3 native SVG) recommended for graph rendering up to 500 nodes; cytoscape.js as fallback for larger graphs. Data model and query patterns defined.

**Findings (nested maps):** Breadcrumb via recursive CTE on parent_map_id. Flat URL (`/campaigns/:slug/maps/:mapSlug`), parent chain computed server-side. Pin click shows popup card with entity preview + "Explore Map" button for child maps. Shift+click for power-user instant navigation. Escape/Backspace keyboard shortcut to parent. flyTo() zoom animation on drill-down.

**Findings (differentiation):** 5 features no single competitor offers in combination:

1. **Markdown-first filesystem storage + web collaborative editing** -- no web tool stores content as .md files; no .md tool (Obsidian) has web collab
2. **External editor sync** -- chokidar watches .md files; edit in VS Code/Obsidian, auto-synced to web UI
3. **Aho-Corasick auto-linking with retroactive linking** -- no tool uses a proper multi-pattern matching automaton
4. **Zero-config self-hosted** -- single Node.js process + SQLite vs Kanka's PHP/MySQL/Redis/MinIO stack
5. **Git-based campaign versioning** -- content is files, so campaigns are git-versionable with history, branches, and collaboration via standard git workflows
