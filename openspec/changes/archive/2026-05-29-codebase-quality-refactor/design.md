## Context

This change is the result of a code audit of Aleph, not a greenfield design. An initial proposal made several incorrect assumptions (input validation, Zod, invitations, Hocuspocus config, graph-builder batching all "missing") that were disproved by reading the code. The scope here is **only** verified problems. Constraints: SQLite via Drizzle (no Redis), SPA mode (SSR disabled), all existing tests must stay green, no breaking API contract changes.

## Goals / Non-Goals

**Goals:**

- Eliminate verified N+1 patterns in list endpoints and genealogy
- Add missing FK indexes (verified absent against query sites)
- Make multi-write endpoints transactional
- Remove a duplicated role-hierarchy constant
- Standardize the list-response shape
- Stop silent error swallowing
- Add a `withApiHandler` error wrapper and adopt it in the largest endpoints
- Split the 961-line `useCampaignApi.ts` with zero call-site changes

**Non-Goals:**

- Input validation work (already done — `validateBody` + Zod in 76 endpoint files)
- Invitation feature (already exists — `invite.post.ts`, `join.post.ts`, `campaign_invitations` table)
- Hocuspocus config (already reads from `runtimeConfig.public.hocuspocusUrl`)
- Mobile UI, rate limiting, caching layer
- Decomposing every large file — only `useCampaignApi`; `MarkdownEditor`/`campaign-import` are out of scope this round

## Decisions

### 1. N+1 fixes via collect-then-batch with `inArray`

For each affected endpoint, collect parent IDs first, run a single `inArray(child.parentId, ids)` query, then group in memory (`Map<parentId, child[]>`). Pattern already used correctly in `graph-builder.ts` — we mirror it. Add a 900-ID chunk guard for SQLite's 999-bind-param limit. **Alternative:** Drizzle relational `with:` queries — cleaner but would require restructuring how these endpoints build results; the `inArray` approach is a minimal diff.

### 2. Indexes added in one migration

All new indexes (`tags.campaignId`, `arcs.campaignId`, `quests.campaignId`, `organizations.campaignId`, `items.campaignId`, `inventories.campaignId`, `currencies.campaignId`) go in a single new Drizzle migration. **Critical:** per the project's known migration-timestamp-ordering bug ([[feedback_migration_timestamps]]), the new migration's `when` in `_journal.json` must be greater than the last entry or it silently won't apply. Verify after generating.

### 3. `withApiHandler` as opt-in wrapper, not global middleware

`withApiHandler(event, async () => {...})` — re-throw H3 errors as-is (they carry statusCode), wrap unknown errors in a generic 500 (no internal leak), log 4xx at `warn` and 5xx at `error` via the existing Winston logger. Opt-in avoids breaking file-download/WebSocket-upgrade routes. **Alternative:** Nitro global error hook — too broad, masks intentional non-JSON responses.

### 4. `useCampaignApi` split: re-export facade

Extract domain methods into 6 new composables; reduce `useCampaignApi.ts` to a facade that spreads them all. Zero call-site changes — every existing `useCampaignApi(id)` import keeps working. **Alternative:** barrel + update all imports — larger diff, more risk, deferred.

### 5. Response-shape standardization is additive, not breaking

Endpoints already returning `{ data, meta }` stay. Endpoints returning raw arrays that _should_ paginate move to `{ data, meta }` — but only where no CLI/frontend consumer depends on the raw array. Each conversion is paired with an updated frontend call site and CLI re-test. Where a raw array is intentional and small (e.g. currencies), document it rather than force pagination. **Risk:** this is the one item that can break consumers — handled by per-endpoint review, not a blanket change.

### 6. Role-hierarchy de-dup is a pure import swap

`remark-strip-secrets.ts` deletes its local `ROLE_HIERARCHY` and imports from `server/utils/permissions.ts`. Behavior identical (values already match). Add a unit test asserting both code paths agree.

## Risks / Trade-offs

- **[Risk] Response-shape change breaks frontend/CLI consumers** → Mitigation: convert one endpoint at a time, update its call site, run integration + E2E + CLI smoke per conversion; leave genuinely-raw endpoints alone
- **[Risk] New migration silently skipped (known timestamp bug)** → Mitigation: after `drizzle-kit generate`, verify `_journal.json` ordering; test that the index exists in a fresh DB
- **[Risk] Transaction wrapping changes error semantics of duplicate.post** → Mitigation: integration test for both success and forced-rollback paths
- **[Risk] Composable split introduces a subtle reactivity regression** → Mitigation: domain composables take the same `campaignId` arg and use identical `$fetch` calls; E2E suite is the backstop
- **[Risk] Removing auth debug logs hides a real diagnostic need** → Mitigation: gate behind `import.meta.dev` rather than deleting outright

## Migration Plan

1. N+1 batch fixes (calendars, inventories, decisions) + tests — no schema change, low risk first
2. Genealogy batch fix + genealogy integration tests
3. Add FK index migration; verify `_journal.json` ordering; test on fresh DB
4. Role-hierarchy de-dup + unit test
5. Silent-catch fixes + debug-log gating
6. `withApiHandler` utility + unit tests; adopt in top endpoints; run integration suite
7. Response-shape standardization, one endpoint at a time, each with consumer update + re-test
8. `useCampaignApi` split + facade; typecheck + E2E
9. Full suite green before PR

**Rollback:** Steps 1–8 are independently revertable. Only step 3 touches the schema; the index migration is additive and droppable.

## Open Questions

- Which raw-array list endpoints have CLI/frontend consumers that _depend_ on the raw shape? (Resolve per-endpoint in step 7 before converting.)
- Should `withApiHandler` emit Sentry breadcrumbs in addition to Winston logs, or is Winston→Sentry transport already wired? (Check existing Sentry server config.)
