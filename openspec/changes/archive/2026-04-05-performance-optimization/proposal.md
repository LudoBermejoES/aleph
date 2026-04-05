## Why

Several server API endpoints exhibit N+1 query patterns that scale linearly with result count. The characters list fires 3 correlated subqueries per row (location name, primary org name, primary org role) — 200 characters means 601 queries for a single page load. The locations list loads ALL locations and ALL characters into memory to compute child counts and inhabitant counts, and hits the filesystem for every location to resolve subtypes. The search endpoint fires 1-3 extra queries per result for visibility checks, type filtering, and slug enrichment.

Beyond query inefficiency, most list endpoints return unbounded result sets (only the entities list has pagination), there are no database indexes on commonly filtered/joined columns, and no HTTP caching headers (ETag / Last-Modified) are set on any response.

These issues compound: a campaign with 200 characters, 150 locations, and 100 entities will generate thousands of queries per navigation cycle and transfer all data regardless of what the user actually sees on screen.

## What Changes

1. **Query optimization** — Rewrite character list, location list, and search endpoints to use JOINs and SQL aggregation instead of per-row subqueries and in-memory computation
2. **Pagination** — Add cursor/offset pagination to all list endpoints that currently return unbounded results (characters, locations, sessions, organizations, maps, quests)
3. **Database indexes** — Add indexes to frequently filtered/joined columns across characters, entities, game_sessions, organizations, maps, entity_relations, session_attendance, and inventory_items tables
4. **HTTP caching** — Add ETag and/or Last-Modified headers to list and detail endpoints
5. **JSON parse caching** — Cache parsed results for dateJson, priceJson, configJson fields

## Capabilities

### New Capabilities

- `paginated-lists`: All list endpoints support pagination via `?page=N&pageSize=N` or cursor-based parameters, returning total count and page metadata
- `http-caching`: List and detail endpoints return ETag / Last-Modified headers; clients can use conditional requests to avoid re-fetching unchanged data

### Modified Capabilities

- `character-list`: Rewrites query to use LEFT JOINs for location and organization data instead of per-row subqueries
- `location-list`: Replaces in-memory aggregation with SQL COUNT subqueries and removes filesystem reads for subtype resolution
- `search`: Replaces per-result visibility and enrichment queries with a single pre-filtered JOIN query
- `entity-list`: Already paginated; adds HTTP caching headers

## Impact

- Modified: `server/api/campaigns/[id]/characters/index.get.ts` — JOIN-based query rewrite
- Modified: `server/api/campaigns/[id]/locations/index.get.ts` — SQL aggregation rewrite
- Modified: `server/api/campaigns/[id]/search.get.ts` — pre-filtered JOIN query
- Modified: `server/api/campaigns/[id]/sessions/index.get.ts` — add pagination
- Modified: `server/api/campaigns/[id]/organizations/index.get.ts` — add pagination
- Modified: `server/api/campaigns/[id]/maps/index.get.ts` — add pagination
- New: `server/db/migrations/XXXX_performance_indexes.ts` — index migration
- Modified: `server/db/schema/characters.ts`, `entities.ts`, `sessions.ts`, `organizations.ts`, `maps.ts`, `relations.ts` — index definitions
- Modified: Frontend list pages to support paginated responses
- aleph-cli: List commands may need `--page` / `--limit` flags if pagination is enforced; no new endpoints are added
- Skill files (`docs/claude-skill.md`, `.claude/skills/aleph-cli/SKILL.md`) must be updated if CLI flags change
