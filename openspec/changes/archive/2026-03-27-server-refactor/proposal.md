## Why

The server API layer has accumulated duplicated constants, repeated logic blocks, and a growing composable that are making the codebase harder to navigate and modify safely. These are mechanical refactors with no user-facing behavior changes.

## What Changes

- **Export `ROLE_LEVEL` and `VISIBILITY_MIN_ROLE` from `server/utils/permissions.ts`** and remove the 4 inline copies in API endpoints
- **Extract `buildVisibilityFilter(role, userId, conditions)`** utility — the identical 10-line RBAC filter block that appears in `entities/index.get.ts`, `locations/index.get.ts`, `locations/[slug].get.ts`, and `search.get.ts`
- **Extract `ensureUniqueSlug(db, campaignId, baseName)`** utility — the slug-uniqueness-check pattern duplicated in `characters`, `organizations`, `locations`, and `entities` POST endpoints
- **Extract `safeReadEntityFile(filePath)`** utility — the try/catch wrapper around `readEntityFile` with a sensible fallback, repeated in 5+ GET endpoints

## Capabilities

- **New Capabilities**: none — pure internal refactoring, no new API surface or user-visible behavior
- **Modified Capabilities**: none — all changes are implementation-only, no spec-level behavior changes

## Impact

- `server/utils/permissions.ts` — add exports
- `server/utils/content-helpers.ts` (new) — `ensureUniqueSlug`, `safeReadEntityFile`
- `server/api/campaigns/[id]/entities/index.get.ts` — use shared utils
- `server/api/campaigns/[id]/locations/index.get.ts` — use shared utils
- `server/api/campaigns/[id]/locations/[slug].get.ts` — use shared utils
- `server/api/campaigns/[id]/search.get.ts` — use shared utils
- `server/api/campaigns/[id]/characters/index.post.ts` — use `ensureUniqueSlug`
- `server/api/campaigns/[id]/organizations/index.post.ts` — use `ensureUniqueSlug`
- `server/api/campaigns/[id]/locations/index.post.ts` — use `ensureUniqueSlug`
- `server/api/campaigns/[id]/entities/index.post.ts` — use `ensureUniqueSlug`
- No API contract changes, no migration needed, no client changes needed
