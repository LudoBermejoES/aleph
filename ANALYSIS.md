# Aleph - Deep Project Analysis

> Generated: 2026-04-04 | Covers: architecture, frontend UX, backend/security, CLI/DevOps, competitive landscape

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Frontend & UX Analysis](#frontend--ux-analysis)
4. [Backend & API Analysis](#backend--api-analysis)
5. [Security Review](#security-review)
6. [Performance](#performance)
7. [Testing Coverage](#testing-coverage)
8. [CLI & DevOps](#cli--devops)
9. [Competitive Landscape & Feature Gaps](#competitive-landscape--feature-gaps)
10. [Prioritized Roadmap](#prioritized-roadmap)

---

## Executive Summary

Aleph is a well-architected TTRPG Campaign Management Suite with a solid foundation: Nuxt 4, Drizzle ORM, collaborative editing via Hocuspocus, a comprehensive entity system, and a CLI tool. The codebase is modern, TypeScript-strict, and follows good patterns.

However, this analysis reveals **significant opportunities** across five areas:

| Area           | Strengths                                              | Key Issues                                                         |
| -------------- | ------------------------------------------------------ | ------------------------------------------------------------------ |
| **Frontend**   | Rich character filtering, dice roller, presence system | Mobile broken, dormant collab editing, missing pages               |
| **Backend**    | Good RBAC, entity permission system, 130+ API routes   | Missing input validation, incomplete CRUD, N+1 queries             |
| **Security**   | Hashed API keys, role hierarchy, session management    | No rate limiting, no CSRF, missing entity-level auth checks        |
| **CLI/DevOps** | 15 commands, Docker + PM2 + CI/CD pipeline             | CLI covers ~60% of API, no pre-commit hooks, only unit tests in CI |
| **Features**   | Collaborative editing, arcs/chapters, economy system   | No interactive maps UI, dormant collab, missing quest detail page  |

---

## Architecture Overview

### Database (39 tables)

```
Auth:        user, session, account, verification, api_key
Campaigns:   campaigns, campaign_members, campaign_member_permissions, campaign_invitations
Entities:    entities, entity_templates, entity_template_fields, entity_types, tags, entity_tags
Characters:  characters, stat_groups, stat_definitions, character_stats, abilities,
             character_connections, character_folders
Sessions:    session_groups, arcs, chapters, game_sessions, session_attendance,
             quests, decisions, consequences, session_contents
Maps:        maps, map_pins, map_layers, map_groups, map_regions
Relations:   relation_types, entity_relations
Economy:     items, inventories, inventory_items, currencies, wealth, shops,
             shop_stock, transactions
World:       calendars, calendar_moons, calendar_seasons, calendar_events,
             timelines, timeline_events, organizations, organization_members,
             organization_locations
Other:       entity_mentions, entity_permissions, entity_specific_viewers, session_rolls
```

### API Surface: 130+ routes across all resources

### Frontend: 45+ pages covering campaigns, characters, entities, locations, organizations, sessions, maps, quests, calendars, timelines, economy

### CLI: 15 commands (campaign, character, entity, location, organization, session, session-group, member, relation, search, roll, config, login, logout, import-arcadia)

---

## Frontend & UX Analysis

### Well-Built Pages

- **Characters list** -- Most polished page. Rich filtering (status, race, class, alignment, org, location), sort controls, NPC folder sidebar, URL-synced query params, portraits with status badges.
- **Sessions list** -- Good upcoming/past grouping, session group tabs, status icons.
- **Session detail** -- Feature-rich with attendance RSVP, decision/consequence system with reveal/hide mechanics, rolls table, multiple content tabs.
- **Maps detail** -- Leaflet viewer with pins, layers, regions, breadcrumb navigation, tiled map support.
- **Timelines detail** -- Three views (chronicle, Gantt, calendar overlay) with inline event creation.
- **Campaign dashboard** -- Clean card grid linking to all subsections with theme settings.

### Critical Frontend Issues

#### 1. Mobile Responsiveness is Broken

The sidebar is a fixed 256px column with **no collapse mechanism and no hamburger menu**. On screens under ~800px the layout breaks. Additional issues:

- Characters page has a filter sidebar creating a 3-column layout on small screens
- Transaction/attendance tables overflow without horizontal scroll
- Timeline calendar grid is a fixed 7-column CSS grid with no mobile adaptation

#### 2. Collaborative Editing is Dormant

The MarkdownEditor has full Hocuspocus/Yjs collaborative editing support, but **no edit page actually wires it up**. Entity edit, character edit, session edit, quest edit -- none pass `collaborative` or `documentName` props. The feature exists but is completely unused.

Additionally, the Hocuspocus WebSocket URL is **hardcoded to `ws://localhost:3334`** in MarkdownEditor -- this will break in production.

#### 3. Missing Pages

| Resource             | What's Missing                              | Impact                                       |
| -------------------- | ------------------------------------------- | -------------------------------------------- |
| **Quests**           | No detail page (`quests/[slug]/index.vue`)  | Users cannot view quest content, only edit   |
| **Items**            | No detail page (`items/[itemId]/index.vue`) | Items only viewable in list                  |
| **Arcs & Chapters**  | Zero frontend pages                         | No way to manage narrative structure from UI |
| **Relations list**   | No list page                                | Relations only discoverable via graph        |
| **Timelines list**   | No list page                                | Must navigate through calendars              |
| **Entity templates** | No management pages                         | Full API exists but no UI                    |
| **Campaign images**  | No management page                          | Upload/retrieve API exists but no UI         |
| **Settings**         | Only API keys                               | No profile editing (name, email, password)   |

#### 4. Graph Page Node Click is Broken

`app/pages/campaigns/[id]/graph.vue` line 112-113 has a `// TODO: navigate to entity by ID` comment -- clicking nodes does nothing. This makes the relationship graph a dead-end visualization.

#### 5. Incomplete Economy Workflow

- **Currencies**: Can create but cannot edit or delete after creation
- **Transactions**: Page is read-only; shows raw `itemId` instead of item name
- **Inventories**: Owner picker requires typing a raw UUID instead of entity/character autocomplete
- **Shops**: List view only, no item management UI

#### 6. Silent Error Handling

Most API calls use `.catch(() => [])` -- users see empty lists instead of error messages when data fails to load. Many forms use `alert()` for errors instead of the existing `ErrorToast` component.

#### 7. Hardcoded Strings (i18n Violations)

- **404 page**: "Page not found", "Back to Campaigns" hardcoded in English
- **Auth layout**: "TTRPG Campaign Manager" hardcoded
- **Breadcrumbs**: "Campaign" text hardcoded across ~10 pages
- **MarkdownEditor**: "You have unsaved changes from a previous session" hardcoded

#### 8. Large Components Need Splitting

| Component                   | Lines | Should Extract                                                   |
| --------------------------- | ----- | ---------------------------------------------------------------- |
| `MarkdownEditor.client.vue` | 522   | Toolbar, entity mention dropdown (raw DOM!), collaboration setup |
| Characters list page        | 312   | Filter bar, folder sidebar, list item                            |
| Session detail page         | 386   | Attendance panel, decisions list, rolls table, content tabs      |

#### 9. Missing UI States

- Many list pages lack loading skeletons (entity detail shows `<p>Loading</p>`)
- No error states -- empty list shown on API failure
- Graph page has no loading skeleton
- Map detail page has no loading/error handling

#### 10. Accessibility Gaps

- MarkdownEditor toolbar uses Unicode characters without aria-labels
- Session-groups modal is hand-rolled (`fixed inset-0`) without `role="dialog"` or keyboard trap
- Many `<select>` elements lack associated `<label>` elements
- `MarkdownEditor.insertLink` uses browser `prompt()` instead of an accessible dialog

---

## Backend & API Analysis

### Missing CRUD Operations

| Resource                | Missing     | Notes                                                  |
| ----------------------- | ----------- | ------------------------------------------------------ |
| **Quests**              | DELETE      | Cannot remove quests                                   |
| **Items**               | PUT, DELETE | Cannot update or remove items                          |
| **Calendars**           | DELETE      | Cannot remove calendars                                |
| **Timelines**           | PUT, DELETE | Cannot update or remove timelines; no DELETE on events |
| **Arcs**                | PUT, DELETE | Cannot update or remove narrative arcs                 |
| **Chapters**            | PUT, DELETE | Cannot update or remove chapters                       |
| **Inventories**         | DELETE      | Cannot remove inventories or inventory items           |
| **Shops**               | PUT, DELETE | Cannot update or remove shops                          |
| **Map layers/regions**  | PUT, DELETE | Cannot modify after creation                           |
| **Currencies**          | PUT, DELETE | Cannot modify after creation                           |
| **Character abilities** | DELETE      | Cannot remove abilities                                |
| **Session contents**    | DELETE      | Cannot remove content entries                          |
| **Character folders**   | PUT, DELETE | Cannot rename or remove folders                        |

Additionally, there's a **501 NOT IMPLEMENTED** at `/api/campaigns/[id]/entities/[slug]/render.get.ts` with a TODO comment.

### Missing Bulk Operations

No bulk delete, bulk update, or bulk export exists for any resource. No data export functionality (CSV, JSON) exists anywhere.

### Input Validation is Minimal

There is **no validation framework** (no Zod schemas on API routes despite Zod being a dependency). Validation is ad-hoc:

- Campaign update: no validation on name, description, isPublic
- Calendar POST: no validation that month/weekday structures are valid
- Character list filters: `search` parameter passed directly to `like()` (potential ReDoS)
- Entities: no validation of JSON fields (aliases, tags, properties, metadata)
- Transactions: no validation of amounts (could be negative, NaN)
- Relations: no validation that attitude is within -100 to +100
- Maps: image upload lacks MIME type validation (only size check)

### Database Schema Issues

#### Missing Indexes (Performance Risk)

| Table                | Missing Indexes                                                          | Impact                        |
| -------------------- | ------------------------------------------------------------------------ | ----------------------------- |
| `characters`         | `characterType`, `status`, `ownerUserId`, `folderId`, `locationEntityId` | Slow character list filtering |
| `entities`           | `type`, `parentId`, composite `(campaignId, type, visibility)`           | Slow entity list queries      |
| `game_sessions`      | `status`, `arcId`, `chapterId`, `groupId`                                | Slow session filtering        |
| `organizations`      | `type`, `status`                                                         | Slow org queries              |
| `maps`               | `parentMapId`, `visibility`                                              | Slow map hierarchies          |
| `calendar_events`    | `linkedEntityId`                                                         | Slow event lookups            |
| `inventory_items`    | `(inventoryId, itemId)`                                                  | Slow stacking checks          |
| `session_attendance` | `(sessionId, userId)`, `rsvpStatus`                                      | Slow RSVP lookups             |
| `entity_relations`   | `(sourceEntityId, relationTypeId)`, `(targetEntityId, relationTypeId)`   | Slow graph queries            |

#### Missing Constraints

- No unique constraint on `organizations (campaignId, slug)`
- No unique constraint on session groups preventing duplicate slugs
- Entity templates lack uniqueness constraint on name within campaign
- No check constraints on status fields (status can be any arbitrary text)
- `entity_specific_viewers` lacks ON DELETE CASCADE for userId
- `organization_members.character_id` lacks explicit FK reference
- Character `is_companion_of` is a string, not a FK reference

#### No Soft Deletes

All deletions are permanent. No `deletedAt` field exists anywhere. No undo capability for any resource.

#### Incomplete Audit Logging

`auditLogFromEvent()` is called in only 4 places (campaign delete, member join, member remove, permission changes). Missing from all entity/character/session/location operations.

### Error Handling Issues

- `JSON.parse(cal.configJson)` without try-catch in calendar advance endpoint
- `JSON.parse(e.dateJson)` could throw on corrupted data
- No try-catch on database `.run()` calls -- constraint violations throw unhandled
- Race conditions: inventory transfer (fetch-validate-update without locking), character slug uniqueness (TOCTOU)
- Inconsistent response format: some routes return `{ success: true }`, others return data, others return null

---

## Security Review

### Critical Issues

#### 1. Missing Entity-Level Permission Checks (HIGH)

The middleware checks campaign membership but **individual entity retrieval endpoints do not check entity-level visibility**:

- `GET /api/campaigns/[id]/entities/[slug]` -- no visibility check
- `GET /api/campaigns/[id]/sessions/[slug]` -- no visibility check
- `GET /api/campaigns/[id]/locations/[slug]` -- no visibility check
- Character retrieval -- no per-entity permission check

The `entity_permissions` and `entity_specific_viewers` tables exist with a sophisticated ACL system, but it's not consistently enforced on read endpoints.

#### 2. No Rate Limiting (MEDIUM-HIGH)

No rate limiting middleware exists anywhere. Auth endpoints are vulnerable to brute force. All endpoints are vulnerable to resource exhaustion.

#### 3. No CSRF Protection (MEDIUM)

No CSRF tokens are issued or validated. Cookie-based sessions are used. SameSite cookie attribute not explicitly set to Strict. State-changing operations (POST/PUT/DELETE) are vulnerable.

#### 4. File Upload Risks (MEDIUM)

- No MIME type validation on image uploads (only file size limit of 10MB)
- Files may be stored with user-controlled paths
- `entity.filePath` written to disk without path traversal validation
- `resolveEntityPath()` could be vulnerable if slug contains `../`

### Positive Security Findings

- API keys are SHA256-hashed before storage
- Better-auth handles password hashing
- Drizzle ORM parameterizes all queries (SQL injection: low risk)
- Role-based access control with 5-level hierarchy works well
- Permission caching with TTL and LRU eviction
- WebSocket token endpoint requires authentication
- Session includes IP address and user agent logging

---

## Performance

### N+1 Queries

**Character list** -- Executes 3 correlated subqueries per character row:

1. Location name lookup (per character)
2. Primary organization name (per character)
3. Primary organization role (per character)

For a campaign with 200 characters, this means 601 queries instead of 1 with proper JOINs.

**Search endpoint** -- For each search result, performs 1-3 separate DB queries (visibility check, type filter, slug enrichment). A search returning 50 results triggers up to 150 extra queries.

**Locations list** -- Loads ALL locations and ALL characters for the entire campaign into memory to compute child counts and inhabitant counts. Also reads the filesystem for every location to resolve subtypes. Should use SQL aggregation subqueries instead.

### Missing Pagination

Only the entities list has pagination (limit/offset). All other list endpoints return unbounded results:

- Characters: all characters, no limit
- Locations: all locations, no limit
- Sessions: all sessions, no limit
- Organizations: all organizations, no limit
- Maps: all maps, no limit
- Quests: all quests, no limit
- Transactions: hard limit of 100 (not user-configurable)

Large campaigns with thousands of entities will cause performance issues.

### Other Performance Concerns

- JSON fields (dateJson, priceJson, configJson) are parsed on every access with no caching
- Markdown autolink rendering happens on every GET request with no caching
- No HTTP caching headers (ETag, Last-Modified)
- No query result caching
- Full-text search indexing lag not addressed

---

## Testing Coverage

### What's Well Tested (109 test files total)

- **Unit (41 files)**: Permissions, character service, calendar service, inventory transfers, dice parsing, search (FTS5), relationships, content rendering, mention scanning, collaboration, maps, auth/API keys, WebSocket tokens, logging
- **Integration (42 files)**: Full CRUD workflows for core entities, permission/RBAC, complex filters, relationships, calendar/timeline ops, session attendance, inventory transactions, mention scanning, image upload, map tiling, collaboration, CLI
- **E2E (26 files)**: Navigation, campaign join, character CRUD, location/org ops, session logs, calendar/timeline UI, image upload, map pins, entity visibility, inventory, org membership, decisions, collaboration, members, secret blocks, graph

### Major Test Gaps

| Gap                           | Risk                                                           |
| ----------------------------- | -------------------------------------------------------------- |
| No tests for Quest operations | Core feature untested                                          |
| No tests for Shops            | Stock/purchase flows untested                                  |
| No tests for API key CRUD     | Only token validation tested                                   |
| No negative/edge case testing | Invalid transitions, permission denials, concurrent operations |
| No performance tests          | N+1 queries not caught                                         |
| No security tests             | XSS, injection, rate limit scenarios not covered               |
| CI only runs unit tests       | Integration and E2E tests skipped in pipeline                  |

---

## CLI & DevOps

### CLI Gaps

The CLI covers 15 commands but **misses ~40% of the API surface**:

| Missing from CLI                                  | API Exists    |
| ------------------------------------------------- | ------------- |
| Maps (CRUD, upload, pins, layers, regions, tiles) | 20+ endpoints |
| Quests (CRUD)                                     | 3+ endpoints  |
| Calendars & Timelines                             | 10+ endpoints |
| Inventory system                                  | 5+ endpoints  |
| Items & Shops                                     | 8+ endpoints  |
| Currencies & Transactions                         | 5+ endpoints  |
| Templates                                         | 5 endpoints   |
| Tags                                              | 2 endpoints   |
| Arcs & Chapters                                   | 4 endpoints   |
| Health check                                      | 1 endpoint    |

### CLI Bugs

- **`roll.js` line 42**: Checks `config.token` instead of `config.apiKey` -- server-side roll recording is broken
- **Inconsistent prompts**: `campaign.js` uses `@inquirer/prompts`, `character.js` uses `readline.createInterface`, `organization.js` reads raw `process.stdin`
- **session-group delete** has no confirmation prompt (unlike all other delete commands)
- `ora` (spinner library) is a declared dependency but unused

### DevOps

**Good:**

- Multi-stage Dockerfile (node:22-slim)
- PM2 with 512MB memory limit, log rotation
- GitHub Actions CI/CD with test gate before deploy
- Automated backup rotation (keeps 3 most recent)
- Cross-architecture native module rebuild handled

**Needs Improvement:**

- **CI only runs unit tests** -- integration and E2E tests are skipped
- **No `.env.example`** -- new developers must guess environment variables
- **No staging environment** -- pushes directly to production from master
- **No rollback mechanism** beyond manual backup restoration
- **No pre-commit hooks** (no Husky/lint-staged)
- **No Prettier config** -- formatting relies on IDE defaults
- **Docker Compose missing `env_file`** directive for secrets
- **Port mismatch**: dev (3000), tests (3333), production (3033) with no centralized config
- **CLI is pure JavaScript** while the rest of the codebase is TypeScript

---

## Competitive Landscape & Feature Gaps

### Market Leaders

| Tool              | Users   | Key Differentiators                                                       |
| ----------------- | ------- | ------------------------------------------------------------------------- |
| **World Anvil**   | 1.5M+   | 25+ entity templates, interactive maps, timelines, FoundryVTT integration |
| **Kanka**         | 375K+   | Open source, family trees, custom calendars, granular permissions/secrets |
| **LegendKeeper**  | Growing | Collaborative whiteboards, 14K-pixel maps, real-time editing              |
| **Chronica**      | Niche   | Battle screen, campaign shop, fog-of-war maps                             |
| **LoreKeeper AI** | New     | AI session transcription, auto-summaries, context-aware generation        |
| **Archivist AI**  | New     | AI session transcription, FoundryVTT integration                          |

### Aleph's Competitive Advantages

- Real-time collaborative editing infrastructure (only LegendKeeper matches)
- API + CLI tool (unique in this space)
- System-agnostic design (works with any TTRPG, not just D&D)
- Multi-language support (uncommon)
- Arc/chapter narrative structure (fairly unique)
- Self-hostable with Docker

### High-Priority Feature Gaps

#### 1. Interactive Maps with Pins/Layers (UI)

Every major competitor offers this. Aleph has the **full backend** (pins, layers, regions, tiles, GeoJSON) but the frontend map editor experience needs enhancement -- particularly around linking pins to entities and nested map navigation. This is the single most differentiating feature in the TTRPG tool space.

#### 2. GM/Player Content Visibility (Secrets System)

Kanka, LegendKeeper, World Anvil, and Chronica all have granular per-section visibility. Aleph has the `entity_permissions` infrastructure but it's not consistently enforced (see Security section) and there's no "preview as player" mode.

#### 3. Entity Templates UI

The backend supports full template CRUD with typed fields (text, number, checkbox, select, date, entity_reference, section). But there are **zero frontend pages** for managing templates. This is a major missed opportunity -- templates reduce blank-page syndrome and guide worldbuilding.

#### 4. AI Session Summaries

This is the hottest feature category in 2025-2026. LoreKeeper AI and Archivist AI are built around session transcription and AI-generated summaries. Aleph already has `session_contents` with `ai_notes` and `summary` content types -- the data model supports it but there's no AI integration.

#### 5. Data Export/Import

No export functionality exists. This creates vendor lock-in anxiety. JSON/CSV export of campaign data would build trust and is expected by technically-minded users (Aleph's target audience given the CLI tool).

### Medium-Priority Feature Gaps

| Feature                          | Competitors                   | Notes                                                 |
| -------------------------------- | ----------------------------- | ----------------------------------------------------- |
| Custom fantasy calendars UI      | Kanka, Chronica, LegendKeeper | Backend exists, frontend is basic                     |
| Family trees / lineage           | Kanka, World Anvil, Scabard   | Character connections exist but no tree visualization |
| Player-contributed journals      | Obsidian Portal, Kanka        | Session notes are GM-only currently                   |
| Entity cross-linking + backlinks | All major competitors         | Mentions system exists but not surfaced well          |
| Worldbuilding prompts/templates  | World Anvil, LegendKeeper     | Template fields exist but no pre-built prompts        |

### Low-Priority / Future Considerations

- VTT integration (FoundryVTT, Roll20) -- complex but high value for VTT users
- Mobile-optimized PWA -- 62% of players want between-session mobile reference
- Encounter builder / combat tracker -- overlaps with VTTs
- Public campaign pages / portfolio -- good for community building
- Offline support -- useful for in-person sessions

---

## Prioritized Roadmap

### Phase 1: Fix What's Broken (Critical)

These are bugs, security issues, and broken features that should be addressed first.

| #   | Item                                                                    | Type        | Effort |
| --- | ----------------------------------------------------------------------- | ----------- | ------ |
| 1   | **Make sidebar responsive** (collapsible on mobile)                     | UX          | Medium |
| 2   | **Fix Hocuspocus URL** (hardcoded `ws://localhost:3334`)                | Bug         | Small  |
| 3   | **Add entity-level permission checks** on GET endpoints                 | Security    | Medium |
| 4   | **Add input validation** (Zod schemas) on all POST/PUT routes           | Security    | Large  |
| 5   | **Fix graph node click** (currently TODO/dead-end)                      | Bug         | Small  |
| 6   | **Fix CLI roll.js** `config.token` -> `config.apiKey` bug               | Bug         | Small  |
| 7   | **Add rate limiting** middleware                                        | Security    | Medium |
| 8   | **Fix N+1 queries** in character list (use JOINs)                       | Performance | Small  |
| 9   | **Add missing database indexes** (characters, entities, sessions, etc.) | Performance | Medium |
| 10  | **Replace `alert()` calls** with ErrorToast component                   | UX          | Small  |

### Phase 2: Complete the Existing Features (High Value)

These unlock value from infrastructure that's already built but not fully exposed.

| #   | Item                                                                                                               | Type       | Effort |
| --- | ------------------------------------------------------------------------------------------------------------------ | ---------- | ------ |
| 11  | **Wire up collaborative editing** on entity/session edit pages                                                     | Feature    | Small  |
| 12  | **Add missing CRUD endpoints** (DELETE for quests, items, calendars, timelines, arcs, chapters, shops, currencies) | Backend    | Medium |
| 13  | **Add quest detail page**                                                                                          | Frontend   | Small  |
| 14  | **Add arcs & chapters management pages**                                                                           | Frontend   | Medium |
| 15  | **Add entity template management UI**                                                                              | Frontend   | Medium |
| 16  | **Add pagination** to all list endpoints (characters, locations, sessions, etc.)                                   | Backend+FE | Medium |
| 17  | **Fix economy workflow** (currency edit/delete, transaction creation, inventory owner picker)                      | Frontend   | Medium |
| 18  | **Fix i18n violations** (404 page, auth layout, breadcrumbs, MarkdownEditor)                                       | Frontend   | Small  |
| 19  | **Add .env.example** and update README                                                                             | DX         | Small  |
| 20  | **Add integration + E2E tests to CI**                                                                              | DevOps     | Small  |

### Phase 3: Differentiate (New Features)

These are new capabilities that would set Aleph apart from competitors.

| #   | Item                                                                                             | Type    | Effort |
| --- | ------------------------------------------------------------------------------------------------ | ------- | ------ |
| 21  | **GM/Player secrets system** -- per-section visibility with "preview as player" mode             | Feature | Large  |
| 22  | **AI session summaries** -- integrate with Claude/OpenAI for `ai_notes` and `summary` generation | Feature | Medium |
| 23  | **Data export** -- JSON/CSV export of full campaign data                                         | Feature | Medium |
| 24  | **Enhanced map editor** -- interactive pin placement linked to entities, nested map navigation   | Feature | Large  |
| 25  | **Custom calendar UI** -- visual calendar with event management, in-game date tracking           | Feature | Medium |
| 26  | **Family tree visualization** -- leverage character connections for lineage display              | Feature | Medium |
| 27  | **Player-contributed journals** -- allow players to write session recaps                         | Feature | Small  |
| 28  | **Activity feed / changelog** -- leverage audit log for "what happened" dashboard                | Feature | Medium |

### Phase 4: Polish & Scale

| #   | Item                                                                            | Type        | Effort |
| --- | ------------------------------------------------------------------------------- | ----------- | ------ |
| 29  | **Refactor large components** (MarkdownEditor, character list, session detail)  | Refactor    | Medium |
| 30  | **Add missing CLI commands** (maps, quests, calendars, inventory, items, shops) | CLI         | Large  |
| 31  | **Migrate CLI to TypeScript**                                                   | DX          | Medium |
| 32  | **Add CSRF protection**                                                         | Security    | Small  |
| 33  | **Add HTTP caching headers**                                                    | Performance | Small  |
| 34  | **Add soft deletes** with undo capability                                       | Backend     | Large  |
| 35  | **Standardize CLI prompts** (all use @inquirer/prompts)                         | CLI         | Small  |
| 36  | **Add pre-commit hooks** (Husky + lint-staged + Prettier)                       | DX          | Small  |
| 37  | **Add loading skeletons** to all pages                                          | UX          | Medium |
| 38  | **Add accessibility improvements** (aria-labels, keyboard nav, dialog roles)    | UX          | Medium |
| 39  | **PWA / mobile optimization**                                                   | Feature     | Large  |
| 40  | **VTT integration hooks** (FoundryVTT)                                          | Feature     | Large  |

---

## Appendix: Quick Wins (< 1 hour each)

These can be done immediately with minimal risk:

1. Fix `cli/src/commands/roll.js` -- change `config.token` to `config.apiKey`
2. Fix 404 page hardcoded strings -- use `$t()` keys
3. Fix auth layout hardcoded string -- use `$t()` key
4. Add `.env.example` with documented variables
5. Remove unused `ora` dependency from CLI
6. Add `env_file: .env` to docker-compose.yml
7. Fix graph node click -- implement `router.push` to entity page
8. Add confirmation prompt to session-group delete command
