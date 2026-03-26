## Context

The frontend currently has 42 pages and ~10 form components that call `$fetch()` inline. Most pages already use `useLoadingState` (which exists and works well) for their primary data load, but auxiliary fetches — folder lists, member lists, relation types, entity types, etc. — are done with silent `try/catch` patterns that swallow errors. Form components are the worst offenders:

```ts
// app/components/forms/CharacterForm.vue
try { members.value = await $fetch(`/api/campaigns/${props.campaignId}/members`) as any[] } catch { members.value = [] }

// app/components/forms/RelationForm.vue
try { relationTypes.value = await $fetch(`/api/campaigns/${props.campaignId}/relation-types`) as any[] } catch { relationTypes.value = [] }
```

API paths are scattered across 42 files with no central registry. TypeScript types are absent (`as any[]` in 61 places).

## Goals / Non-Goals

**Goals:**
- Single `useCampaignApi(campaignId)` composable that owns all endpoint paths and return types
- All 42 pages and 10 form components use the composable — no inline `$fetch` in app code
- Typed response interfaces (no `as any`) for all campaign resources
- `useLoadingState` already covers primary page loads — keep it, just wire it to composable calls

**Non-Goals:**
- Request caching or deduplication (out of scope — add later if needed)
- Global state management / Pinia (no shared state required yet)
- Server-side changes (zero changes to `/server/`)
- Changing any user-visible behavior

## Decisions

### Decision 1: One composable factory, not a class or module

**Choice**: `useCampaignApi(campaignId: string)` returns a plain object of async functions.

**Why**: Fits the Vue composable convention the codebase already uses (`useLoadingState`, `useAuth`, `useCampaignSocket`). Simpler than a class, more ergonomic than a standalone module since `campaignId` is derived from the route and changes per page.

```ts
// Usage in a page
const api = useCampaignApi(campaignId)
const chars = await api.getCharacters({ type: 'pc' })
```

**Alternative considered**: Named exports from `~/composables/api.ts` (module-style). Rejected because it would require passing `campaignId` to every call, and the composable factory captures it once cleanly.

### Decision 2: Types defined in `~/types/api.ts`, shared by composable and callers

**Choice**: Create `app/types/api.ts` with interfaces for every resource (Character, Entity, RelationType, etc.). The composable uses them as return types; pages and components benefit automatically via TypeScript inference.

**Why**: Avoids duplicating types across files. The server already has Drizzle schema types — the frontend interfaces only need the shape returned by each endpoint, not the full DB type.

**Alternative considered**: Deriving types from Drizzle schema via `$inferSelect`. Too tightly coupled to DB shape; API responses often differ (e.g., joined fields, computed fields).

### Decision 3: Extend `useLoadingState` minimally, don't replace it

**Choice**: `useLoadingState` already handles the primary load pattern well. Form components that do auxiliary fetches should use `api.getX()` directly (no `useLoadingState` needed for those — they're fire-and-forget on mount with a fallback to `[]`).

**Why**: The silent fallback behavior (show form without dropdown options rather than blocking the form) is actually correct UX for optional auxiliary data. The fix is to use typed calls and remove `as any` — not to add error UI where none is needed.

**What changes**: The empty `catch {}` becomes `catch { /* intentional fallback to [] */ }` or uses a helper `api.getX().catch(() => [])` pattern.

## Risks / Trade-offs

- **Large surface area**: 42 pages + 10 components to touch. Mitigated by the mechanical nature of each change (find `$fetch`, replace with `api.getX()`). Systematic, not complex.
- **Missing endpoint coverage**: If a page uses an endpoint not yet in the composable, it will TypeScript-error. This is a feature, not a bug — it forces completeness. Add to composable before touching the page.
- **Composable grows large**: With 30+ endpoints, `useCampaignApi` could become a big file. Acceptable at this scale; can be split by domain (characters, entities, etc.) later if needed.

## Migration Plan

1. Create `app/types/api.ts` with all resource interfaces
2. Create `app/composables/useCampaignApi.ts` covering all endpoints
3. Migrate pages one domain at a time (characters → entities → sessions → maps → ...)
4. Migrate form components last (they're the `try/catch` hotspots)
5. Verify with `grep -r '\$fetch' app/` — should return zero results when done

No rollback needed; this is a pure refactor with no behavior change. Each page migration is independently testable.

## Open Questions

- None. Scope is clear; implementation is mechanical.
