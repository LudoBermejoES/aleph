## Why

A code audit of the Aleph codebase surfaced a focused set of _verified_ quality and performance problems: several N+1 query patterns in list endpoints, foreign-key columns missing indexes, multi-write endpoints that lack transactions (risking orphaned rows), a duplicated role-hierarchy constant, inconsistent list-response shapes, silent error swallowing, and a 961-line API composable monolith. None of these are speculative — each is backed by a concrete file and line. Fixing them now reduces query load, prevents data corruption, and makes the codebase consistent before more features pile on.

> **Note:** An earlier draft of this proposal assumed input validation, Zod, the `campaign_invitations` table, the invite/join flow, the Hocuspocus runtime-config URL, and graph-builder batching were all missing. A fact-check against the code proved they already exist and work. Those items have been **removed** from scope. What remains below is verified against the current code.

## What Changes

- **Fix verified N+1 queries**: Batch-load related rows in the calendars, inventories, and session-decisions list endpoints (each currently issues one query _per row_ inside `.map()`)
- **Add missing FK indexes**: Add indexes on `campaign_id` for `tags`, `arcs`, `quests`, `organizations`, `items`, `inventories`, `currencies` (all queried by `campaignId` with no supporting index)
- **Wrap multi-write operations in transactions**: `characters/[slug]/duplicate.post.ts` performs 4+ sequential inserts with no `db.transaction()` — wrap it (and audit family-link + import paths) so a mid-operation failure cannot orphan rows
- **De-duplicate role hierarchy**: `server/services/remark-strip-secrets.ts` redefines `ROLE_HIERARCHY` locally instead of importing the canonical one from `server/utils/permissions.ts` — import the shared constant
- **Standardize list-response shape**: Several list endpoints return a raw array while others return `{ data, meta }`; converge on the paginated `{ data, meta }` contract used by the helper, keeping a documented raw-array escape hatch only where `pageSize === 0`
- **Stop swallowing errors silently**: Replace empty `catch {}` blocks in `useSecretReveals.ts`, `MarkdownEditor.client.vue`, and `useCampaignSocket.ts` with at least a `console.warn`/Sentry breadcrumb
- **Introduce a `withApiHandler` error wrapper**: No standardized error-catching utility exists; add one and adopt it in the largest endpoints so unexpected errors return a clean 500 instead of leaking internals
- **Split `useCampaignApi.ts` (961 lines)**: Extract domain composables (`useCharacterApi`, `useSessionApi`, `useEntityApi`, `useMapApi`, `useInventoryApi`, `useCalendarApi`) and reduce `useCampaignApi` to a backward-compatible re-export facade
- **Fix genealogy N+1**: `server/services/genealogy.ts` calls `loadRelations(entityId)` once per node inside the BFS loop — batch the relation fetch
- **Remove production debug logging**: `app/middleware/auth.global.ts` and `useAuth.ts` log session details (including user email) to the console on every navigation — gate behind a debug flag or remove

## Capabilities

### New Capabilities

- `api-error-handler`: Server-side `withApiHandler` wrapper standardizing error catching and response shapes
- `frontend-api-composables`: Domain-split API composables extracted from the `useCampaignApi` monolith, with backward-compatible re-exports
- `query-performance`: Batch-loading fixes for N+1 list endpoints + genealogy, plus missing FK indexes
- `data-integrity`: Transactional wrapping of multi-write operations to prevent partial/orphaned writes
- `api-consistency`: Standardized list-response shape and de-duplicated role-hierarchy constant

### Modified Capabilities

- _(none — no existing spec's normative requirements change; this is additive hardening)_

## Impact

**Server API** (`server/api/`): N+1 fixes in `calendars/index.get.ts`, `inventories/index.get.ts`, `sessions/[slug]/decisions/index.get.ts`; response-shape standardization across list endpoints; `db.transaction()` added to `characters/[slug]/duplicate.post.ts`; `withApiHandler` adopted in the largest endpoints.

**Server utils** (`server/utils/`): New `api-handler.ts`.

**Server services** (`server/services/`): `genealogy.ts` batch relation load; `remark-strip-secrets.ts` imports shared `ROLE_HIERARCHY`.

**Server DB schema** (`server/db/schema/`): New indexes on `entities.ts` (tags), `sessions.ts` (arcs, quests), `organizations.ts`, `inventory.ts` (items, inventories, currencies) → requires a new Drizzle migration.

**Frontend** (`app/`): `useCampaignApi.ts` split into 6 composables + facade; empty catch blocks in `useSecretReveals.ts`, `MarkdownEditor.client.vue`, `useCampaignSocket.ts` log on failure; debug logging removed from `middleware/auth.global.ts` and `useAuth.ts`.

**aleph-cli**: No impact. No API contracts change (response-shape standardization affects only endpoints that already returned `{ data, meta }` inconsistently; CLI consumers must be re-tested but no new/removed endpoints).

**Tests**: New unit tests for `withApiHandler`, the batch-load helpers, and the role-constant de-dup; new integration tests asserting consistent list-response shape and transaction rollback; existing tests must stay green.
