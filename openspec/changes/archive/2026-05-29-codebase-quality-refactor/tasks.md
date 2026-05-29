## 1. N+1 Query Fixes — List Endpoints

- [x] 1.1 In `server/api/campaigns/[id]/calendars/index.get.ts`, collect calendar IDs and fetch moons + seasons via `inArray`, then group in memory (replace the per-row queries inside `.map()`)
- [x] 1.2 In `server/api/campaigns/[id]/inventories/index.get.ts`, fetch inventory items for all inventories via a single `inArray` join query, then group by `inventoryId`
- [x] 1.3 In `server/api/campaigns/[id]/sessions/[slug]/decisions/index.get.ts`, fetch consequences for all decisions via one `inArray` query, then apply role-based revelation filtering in memory
- [x] 1.4 Add/update integration tests asserting response content is unchanged for calendars, inventories, and decisions endpoints
- [ ] 1.5 (Optional) Add a query-count assertion or log to demonstrate the N+1 is gone

## 2. N+1 Query Fix — Genealogy Service

- [x] 2.1 In `server/services/genealogy.ts`, refactor the BFS loop so `loadRelations` is called once per frontier (batched via `inArray`) instead of once per node
- [x] 2.2 Add a 900-ID chunk guard for the batched relation query (SQLite bind-param limit)
- [x] 2.3 Run existing genealogy unit + integration tests; confirm tree output (nodes, edges, generations) is identical

## 3. Missing Foreign-Key Indexes

- [x] 3.1 Add `index('idx_tags_campaign').on(table.campaignId)` to the `tags` table in `server/db/schema/entities.ts`
- [x] 3.2 Add `campaignId` indexes to `arcs` and `quests` in `server/db/schema/sessions.ts`
- [x] 3.3 Add `campaignId` index to `organizations` in `server/db/schema/organizations.ts`
- [x] 3.4 Add `campaignId` indexes to `items`, `inventories`, `currencies` in `server/db/schema/inventory.ts`
- [x] 3.5 Generate the Drizzle migration (`npx drizzle-kit generate`)
- [x] 3.6 Verify the new migration's `when` in `_journal.json` is later than the previous entry (known timestamp-ordering bug); fix ordering if needed
- [x] 3.7 Apply to a fresh DB and confirm the indexes exist; run the migration integration test

## 4. De-duplicate Role Hierarchy

- [x] 4.1 In `server/services/remark-strip-secrets.ts`, delete the local `ROLE_HIERARCHY` and import it from `server/utils/permissions.ts`
- [x] 4.2 Add a unit test asserting the role ordering used by remark-strip-secrets matches `permissions.ROLE_HIERARCHY` for all five roles
- [x] 4.3 Run secrets-stripping unit tests to confirm behavior unchanged

## 5. Stop Silent Error Swallowing

- [x] 5.1 In `app/composables/useSecretReveals.ts`, replace the empty `catch {}` with a `console.warn` (or Sentry breadcrumb)
- [x] 5.2 In `app/components/MarkdownEditor.client.vue`, replace the two empty `catch {}` blocks with warnings
- [x] 5.3 In `app/composables/useCampaignSocket.ts`, log the swallowed error before returning
- [x] 5.4 Run unit/E2E tests affected by these files

## 6. Remove / Gate Production Debug Logging

- [x] 6.1 In `app/middleware/auth.global.ts`, gate the six `console.log`/`console.error` calls behind `import.meta.dev` (or remove)
- [x] 6.2 In `app/composables/useAuth.ts`, gate or remove the session-detail logging (do not log user email in production)
- [x] 6.3 Audit `useCampaignSocket.ts` line ~109 log and gate if it runs in production
- [x] 6.4 Confirm a production build produces no auth/session console output (manual or E2E console-assertion)

## 7. API Error Handler Utility

- [x] 7.1 Create `server/utils/api-handler.ts` exporting `withApiHandler(event, handler)`
- [x] 7.2 Re-throw H3 errors as-is; wrap unknown errors in HTTP 500 `{ statusCode: 500, message: 'Internal server error' }` (no internal leak)
- [x] 7.3 Log 4xx at `warn` and 5xx at `error` via the existing Winston logger
- [x] 7.4 Write unit tests in `tests/unit/server/api-handler.test.ts`: success pass-through, H3 re-throw, unknown→500, warn/error log levels
- [x] 7.5 Adopt `withApiHandler` in the 10 largest endpoints (campaigns `[id]` get; characters list/get/put/duplicate/family-post; sessions list/get; entities list/get)
- [x] 7.6 Run the full integration suite; update any test asserting an old error shape

## 8. Standardize List-Response Shape

- [x] 8.1 Inventory which list endpoints return raw arrays vs `{ data, meta }` (start from: campaigns index, calendars, currencies, organizations, maps)
- [x] 8.2 For each raw-array endpoint that should paginate, identify its frontend composable call site and any CLI consumer
- [x] 8.3 Convert one endpoint at a time to `{ data, meta }`, updating its consumer; keep raw array only for `pageSize===0` or documented small lists
- [x] 8.4 Add a code comment on intentionally-raw endpoints (e.g., currencies) marking the shape as deliberate
- [x] 8.5 Per conversion: run integration + E2E + a CLI smoke test for that resource

## 9. Split useCampaignApi Composable

- [x] 9.1 Create `app/composables/useCharacterApi.ts` (characters, abilities, stats, connections, folders, family)
- [x] 9.2 Create `app/composables/useSessionApi.ts` (sessions, groups, arcs, chapters, attendance, rolls)
- [x] 9.3 Create `app/composables/useEntityApi.ts` (entities, templates, mentions)
- [x] 9.4 Create `app/composables/useMapApi.ts` (maps, pins, layers, regions)
- [x] 9.5 Create `app/composables/useInventoryApi.ts` (items, inventories, shops, transactions, currencies, wealth)
- [x] 9.6 Create `app/composables/useCalendarApi.ts` (calendars, timelines, calendar/timeline events)
- [x] 9.7 Reduce `app/composables/useCampaignApi.ts` to a facade re-exporting all six; verify same `campaignId` signature and identical `$fetch` URLs/methods
- [x] 9.8 Run `npx nuxi typecheck` — zero errors in composable files
- [x] 9.9 Run E2E suite — no regressions (194 passed, 2 skipped, 0 failed)

## 10. Final Verification

- [x] 10.1 `npx vitest run tests/unit/` — all pass (1203/1203)
- [x] 10.2 `npx vitest run tests/integration/` (server on port 3333) — all pass (688/688)
- [x] 10.3 `npx playwright test` — all pass (194/194, 2 skipped)
- [x] 10.4 `npx nuxi typecheck` — zero errors in changed files (pre-existing errors in tldraw/cytoscape shapes unrelated)
- [x] 10.5 Quick CLI smoke (`node cli/bin/aleph.js` list commands for affected resources) — no breakage
