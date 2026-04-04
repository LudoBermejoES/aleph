## 1. Database indexes migration

- [ ] 1.1 Add index definitions to Drizzle schema files: `server/db/schema/characters.ts` (characterType, status, ownerUserId, folderId, locationEntityId), `server/db/schema/entities.ts` (type, parentId), `server/db/schema/sessions.ts` (status, arcId, chapterId, groupId), `server/db/schema/organizations.ts` (type, status), `server/db/schema/maps.ts` (parentMapId, visibility), `server/db/schema/relations.ts` (sourceEntityId+relationTypeId, targetEntityId+relationTypeId composite), `server/db/schema/sessions.ts` session_attendance (sessionId+userId composite), `server/db/schema/inventory.ts` inventory_items (inventoryId+itemId composite)
- [ ] 1.2 Generate and apply Drizzle migration — single migration file with all `CREATE INDEX IF NOT EXISTS` statements; verify with `npx drizzle-kit generate` and `npx drizzle-kit migrate`

## 2. Query rewrites — characters list

- [ ] 2.1 Rewrite `server/api/campaigns/[id]/characters/index.get.ts` to use LEFT JOINs for location name (join entities table on locationEntityId), primary organization name (join organizations + character_organizations), and primary organization role — replacing the per-row subqueries; ensure the response shape is identical
- [ ] 2.2 Rewrite `server/api/campaigns/[id]/characters/meta.get.ts` if it also uses per-row queries for aggregation — use SQL COUNT/GROUP BY instead

## 3. Query rewrites — search endpoint

- [ ] 3.1 Rewrite `server/api/campaigns/[id]/search.get.ts` to perform visibility filtering in the SQL WHERE clause (based on user role and entity visibility settings), type filtering via WHERE, and slug/name enrichment via JOINs — replacing per-result post-processing queries

## 4. Query rewrites — locations list

- [ ] 4.1 Rewrite `server/api/campaigns/[id]/locations/index.get.ts` to compute child location counts via `SELECT COUNT(*) ... GROUP BY parentId` subquery or LEFT JOIN, and inhabitant counts via `SELECT COUNT(*) FROM characters WHERE locationEntityId = ...` subquery or LEFT JOIN — replacing the in-memory JS loops over all locations and all characters
- [ ] 4.2 Remove filesystem reads for location subtype resolution — read entity type information from the database query result instead

## 5. Pagination — backend

- [ ] 5.1 Create a shared pagination utility (e.g., `server/utils/pagination.ts`) that parses `page` and `pageSize` query params, clamps pageSize to max 200, handles `pageSize=0` for backward compatibility, and returns `{ limit, offset, page, pageSize }` along with a `buildMeta(total)` helper that returns `{ page, pageSize, total, totalPages }`
- [ ] 5.2 Add pagination to `server/api/campaigns/[id]/characters/index.get.ts` — wrap response in `{ data: [...], meta: { page, pageSize, total, totalPages } }`
- [ ] 5.3 Add pagination to `server/api/campaigns/[id]/locations/index.get.ts`
- [ ] 5.4 Add pagination to `server/api/campaigns/[id]/sessions/index.get.ts`
- [ ] 5.5 Add pagination to `server/api/campaigns/[id]/organizations/index.get.ts`
- [ ] 5.6 Add pagination to `server/api/campaigns/[id]/maps/index.get.ts`
- [ ] 5.7 Add pagination to quests list endpoint (if it exists as a separate endpoint, or to the entities list filtered by type=quest)

## 6. Pagination — frontend

- [ ] 6.1 Create a shared pagination composable (e.g., `app/composables/usePagination.ts`) that manages page state, syncs with URL query params, and provides reactive `page`, `pageSize`, `total`, `totalPages` refs
- [ ] 6.2 Update `app/pages/campaigns/[id]/characters/index.vue` to use paginated API response and render pagination controls (shadcn-vue Pagination component)
- [ ] 6.3 Update `app/pages/campaigns/[id]/locations/index.vue` to use paginated API response and pagination controls
- [ ] 6.4 Update `app/pages/campaigns/[id]/sessions/index.vue` to use paginated API response and pagination controls
- [ ] 6.5 Update `app/pages/campaigns/[id]/organizations/index.vue` to use paginated API response and pagination controls
- [ ] 6.6 Update `app/pages/campaigns/[id]/maps/index.vue` to use paginated API response and pagination controls

## 7. HTTP caching

- [ ] 7.1 Create Nitro server middleware (e.g., `server/middleware/etag.ts`) that computes an ETag from the response body hash for GET requests and handles `If-None-Match` conditional requests by returning 304 Not Modified
- [ ] 7.2 Add `Cache-Control` headers to list and detail endpoints — e.g., `Cache-Control: private, max-age=0, must-revalidate` to enable conditional caching without stale data

## 8. CLI updates

- [ ] 8.1 Add `--page` and `--limit` flags to CLI list commands in `cli/src/commands/character.js`, `cli/src/commands/location.js`, `cli/src/commands/session.js`, `cli/src/commands/organization.js` — pass as query params; display pagination info in output
- [ ] 8.2 Update `cli/src/lib/client.js` if needed to support query parameter passing for pagination
- [ ] 8.3 Update `docs/claude-skill.md` and `.claude/skills/aleph-cli/SKILL.md` to document `--page` and `--limit` flags on list commands; bump SKILL.md version

## 9. Tests

- [ ] 9.1 Add unit tests in `tests/unit/pagination.test.ts` for the pagination utility — covers param parsing, clamping, meta computation, edge cases (page 0, negative pageSize, pageSize=0)
- [ ] 9.2 Add integration tests in `tests/integration/query-optimization.test.ts` — for each rewritten endpoint (characters, locations, search), verify: correct response shape, correct data (JOIN results match previous subquery results), and that response times are reasonable
- [ ] 9.3 Add integration tests in `tests/integration/pagination.test.ts` — for each paginated endpoint, verify: default pagination, custom page/pageSize, page beyond total, pageSize=0 backward compat, meta fields present
- [ ] 9.4 Add integration tests in `tests/integration/http-caching.test.ts` — verify: ETag header present on GET responses, 304 returned on matching If-None-Match, 200 returned on mismatched If-None-Match
- [ ] 9.5 Add E2E tests in `tests/e2e/pagination.spec.ts` — verify: pagination controls render when results exceed page size, clicking next page loads new data, URL updates with page param

## 10. Verification

- [ ] 10.1 Run full unit test suite: `npx vitest run tests/unit/`
- [ ] 10.2 Run full integration test suite: `npx vitest run tests/integration/` (with server running on port 3333)
- [ ] 10.3 Run full E2E test suite: `npx playwright test`
- [ ] 10.4 Run `npx nuxi build` to verify no build errors
- [ ] 10.5 Run `npx drizzle-kit check` to verify migration integrity
