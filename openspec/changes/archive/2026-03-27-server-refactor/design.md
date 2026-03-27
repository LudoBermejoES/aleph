## Context

Three patterns appear repeatedly across server API endpoints:

1. **Permission constants** — `VISIBILITY_MIN_ROLE` and `ROLE_LEVEL` are defined as local `const` maps in 4 endpoints. The values are already present inside `permissions.ts` but not exported in a usable form for raw comparisons.

2. **Visibility filter block** — A 10-line Drizzle `conditions.push(or(inArray(...), and(...)))` block applying RBAC to list queries appears verbatim in `entities/index.get.ts`, `locations/index.get.ts`, `locations/[slug].get.ts`, and `search.get.ts`.

3. **Slug uniqueness check** — A 4-line pattern (`slugify → select → if exists append timestamp`) appears in `characters`, `organizations`, `locations`, and `entities` POST endpoints.

4. **Safe file read** — A try/catch wrapper around `readEntityFile` with a silent fallback appears in 5+ GET endpoints.

## Goals / Non-Goals

**Goals**: Eliminate the four duplication patterns above. No behavior changes.

**Non-Goals**: Splitting `useCampaignApi.ts`, adding DB error handling, typing `any` returns — these are separate changes with higher risk/effort.

## Decisions

**Export constants from permissions.ts** — `ROLE_LEVEL` becomes a re-export alias for `ROLE_HIERARCHY` (already exists). `VISIBILITY_MIN_ROLE` is already defined inside permissions.ts but not exported — just add `export`.

**New file `server/utils/content-helpers.ts`** — houses `ensureUniqueSlug` and `safeReadEntityFile`. Keeps permissions.ts focused on auth logic.

**`buildVisibilityFilter` goes in `server/utils/permissions.ts`** — it's pure permission logic and already imports from there.

## Risks / Trade-offs

[Risk] Changing import paths in 8+ files could introduce a regression if a path is wrong → Mitigation: TypeScript compiler will catch missing exports at build time; integration tests cover all affected endpoints.

[Risk] `ROLE_LEVEL` local copies may have subtle differences from `ROLE_HIERARCHY` → Mitigation: Verify values are identical before replacing (they are: dm=5, co_dm=4, editor=3, player=2, visitor=1).

## Migration Plan

1. Add exports to `permissions.ts` and create `content-helpers.ts`
2. Update each endpoint file one at a time, verifying tests pass after each group
3. No deployment coordination needed — purely internal

## Open Questions

None.
