## 1. Export shared constants from permissions.ts

- [x] 1.1 Add `export const VISIBILITY_MIN_ROLE` to `server/utils/permissions.ts` (already defined, just missing `export`)
- [x] 1.2 Add `export const ROLE_LEVEL = ROLE_HIERARCHY` alias to `server/utils/permissions.ts`
- [x] 1.3 Remove inline `VISIBILITY_MIN_ROLE` and `ROLE_LEVEL` const blocks from `entities/index.get.ts`, `locations/index.get.ts`, `locations/[slug].get.ts`, `search.get.ts` and replace with imports

## 2. Extract buildVisibilityFilter into permissions.ts

- [x] 2.1 Add `buildVisibilityFilter(role, userId, conditions)` function to `server/utils/permissions.ts`
- [x] 2.2 Replace the inline RBAC filter block in `entities/index.get.ts` with a call to `buildVisibilityFilter`
- [x] 2.3 Replace the inline RBAC filter block in `locations/index.get.ts` with a call to `buildVisibilityFilter`
- [x] 2.4 Replace the inline RBAC filter block in `locations/[slug].get.ts` with a call to `buildVisibilityFilter`
- [x] 2.5 Replace the inline RBAC filter block in `search.get.ts` with a call to `buildVisibilityFilter`

## 3. Create content-helpers.ts with ensureUniqueSlug

- [x] 3.1 Create `server/utils/content-helpers.ts` with `ensureUniqueSlug(db, campaignId, baseName)` function
- [x] 3.2 Replace inline slug-uniqueness logic in `characters/index.post.ts` with `ensureUniqueSlug`
- [x] 3.3 Replace inline slug-uniqueness logic in `organizations/index.post.ts` with `ensureUniqueSlug` (N/A — orgs use own table + 409 conflict, different pattern)
- [x] 3.4 Replace inline slug-uniqueness logic in `locations/index.post.ts` with `ensureUniqueSlug`
- [x] 3.5 Replace inline slug-uniqueness logic in `entities/index.post.ts` with `ensureUniqueSlug`

## 4. Add safeReadEntityFile to content-helpers.ts

- [x] 4.1 Add `safeReadEntityFile(filePath)` to `server/utils/content-helpers.ts`
- [x] 4.2 Replace try/catch `readEntityFile` blocks in `entities/index.get.ts` with `safeReadEntityFile` (N/A — no file reads in this endpoint)
- [x] 4.3 Replace try/catch `readEntityFile` blocks in `locations/index.get.ts` with `safeReadEntityFile`
- [x] 4.4 Replace try/catch `readEntityFile` blocks in `locations/[slug].get.ts` with `safeReadEntityFile`
- [x] 4.5 Replace try/catch `readEntityFile` blocks in `locations/[slug]/sub-locations.get.ts` with `safeReadEntityFile`
- [x] 4.6 Replace try/catch `readEntityFile` blocks in any remaining endpoints that use the same pattern (N/A — remaining usages are in primary GET/PUT handlers where file-not-found should surface as an error)
