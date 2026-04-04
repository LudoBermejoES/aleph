## Context

Aleph's server API was built feature-first: each endpoint fetches its primary data and then loops over results to enrich them with related data (location names, organization roles, child counts, etc.). This approach was correct for early development but has become a scaling bottleneck now that campaigns have hundreds of characters, locations, and entities.

The three worst offenders are:
- **Characters list** (`server/api/campaigns/[id]/characters/index.get.ts`): 3 correlated subqueries per row for location name, primary organization name, and primary organization role. 200 characters = 601 queries.
- **Locations list** (`server/api/campaigns/[id]/locations/index.get.ts`): Loads ALL locations and ALL characters into memory to compute child counts and inhabitant counts via JS loops. Also reads the filesystem for every location to resolve entity subtypes.
- **Search** (`server/api/campaigns/[id]/search.get.ts`): 1-3 extra queries per search result for visibility checks, type filtering, and slug enrichment. 50 results = up to 150 extra queries.

Additionally, no list endpoint except entities uses pagination, no database indexes exist on foreign key or filter columns, and no HTTP caching headers are set anywhere.

## Goals / Non-Goals

**Goals:**
- Eliminate all N+1 query patterns in character list, location list, and search endpoints
- Add pagination to all unbounded list endpoints (characters, locations, sessions, organizations, maps, quests)
- Add database indexes on all frequently filtered, joined, or sorted columns
- Add ETag or Last-Modified HTTP caching headers to list and detail endpoints
- Maintain backward compatibility — existing API consumers (frontend + CLI) must continue to work, with pagination being opt-in initially (default large page size) then enforced

**Non-Goals:**
- Full-text search engine (e.g., MeiliSearch, Typesense) — SQLite FTS is sufficient for now
- Server-side response caching layer (Redis, in-memory LRU) — query optimization should be enough
- WebSocket/real-time list updates — out of scope
- GraphQL or query language changes — REST endpoints remain

## Decisions

**Decision 1: Offset pagination, not cursor-based**
Offset pagination (`?page=1&pageSize=25`) is simpler to implement, works naturally with Drizzle ORM's `.limit().offset()`, and is easier for the frontend to render page controls for. Cursor-based pagination is only beneficial for infinite-scroll UIs or very large datasets — Aleph campaigns rarely exceed a few hundred items per type. The entity list endpoint already uses offset pagination, so this maintains consistency.

**Decision 2: Default page size of 50, max of 200**
A default of 50 covers most campaigns entirely in one page while protecting against unbounded queries. Maximum of 200 prevents abuse. Clients can request `?pageSize=0` to get all results (backward compatibility) during a transition period, to be removed later.

**Decision 3: JOIN-based rewrites, not SQL views**
Rewrite queries inline using Drizzle's `.leftJoin()` rather than creating SQL views. Views add migration complexity and Drizzle's view support is less mature. The queries are not complex enough to warrant abstraction into views.

**Decision 4: Indexes via a single migration file**
All index additions go into one migration rather than one-per-table. This keeps the migration count manageable and the indexes are logically related (all for performance). SQLite handles `CREATE INDEX IF NOT EXISTS` well.

**Decision 5: ETag via content hash, not Last-Modified**
ETag based on a hash of the serialized response is simpler than tracking per-row modification timestamps (which would require schema changes). The server computes a quick hash of the JSON response body and returns it as the ETag. On conditional requests (`If-None-Match`), return 304 if unchanged. This can be implemented as Nitro middleware.

**Decision 6: Location subtype resolution via DB column, not filesystem**
Instead of reading the filesystem to resolve location subtypes at query time, ensure the `entityType` or a dedicated column stores this information. If it already does, simply read it from the query result instead of the filesystem.

**Decision 7: Backward-compatible rollout**
Phase 1: Add indexes + rewrite queries (transparent improvement, no API change). Phase 2: Add pagination support (opt-in — endpoints accept page params but default to returning all results). Phase 3: Add HTTP caching headers. This ordering minimizes risk.

## Migration Plan

1. Generate and apply the index migration — zero downtime, SQLite handles concurrent reads during index creation
2. Deploy query rewrites — same API shape, faster responses, no client changes needed
3. Deploy pagination — new query params accepted, default behavior unchanged (large default page size)
4. Update frontend pages to use pagination controls
5. Update CLI list commands to accept `--page` / `--limit` flags
6. Deploy HTTP caching middleware

## Risks / Trade-offs

- [Index migration on large DB] SQLite index creation locks writes briefly. Aleph's databases are small (< 100MB typically), so this should complete in under a second. No mitigation needed.
- [Pagination breaks existing integrations] Mitigated by Decision 2 — default page size is large enough to return all results for most campaigns, and `pageSize=0` is available as an escape hatch.
- [ETag computation overhead] Hashing every response body adds CPU time. For typical Aleph response sizes (< 100KB), this is negligible (< 1ms). If it becomes an issue, switch to Last-Modified with row timestamps.
- [JOIN complexity] Replacing simple loops with multi-table JOINs makes queries harder to read. Mitigated by adding inline comments explaining each JOIN's purpose.
