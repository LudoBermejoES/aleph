## Why

Aleph currently has several security gaps that leave it vulnerable to common web application attacks. Entity-level visibility rules (the `entity_permissions` and `entity_specific_viewers` tables, plus the `visibility` column on entities) exist in the schema and have a full resolution function (`canUserAccessEntity` in `server/utils/permissions.ts`), but no GET endpoint actually calls it — any campaign member can read any entity regardless of its visibility setting. All 69 POST/PUT/PATCH routes consume `readBody(event)` with zero schema validation despite Zod already being a project dependency. There is no rate limiting on any endpoint, including authentication. Search parameters containing SQL LIKE wildcards (`%`, `_`) are interpolated unsanitized. Image upload endpoints trust the client-provided MIME type without verifying actual file content. Cookie sessions lack CSRF protection.

## What Changes

- Enforce entity visibility on all GET single-entity endpoints (`entities/[slug]`, `characters/[slug]`, `locations/[slug]`, `sessions/[slug]`, etc.) using the existing `canUserAccessEntity` function and `entitySpecificViewers` table
- Add Zod validation schemas for all POST/PUT/PATCH routes, with a shared `validateBody` utility that wraps `readBody` + Zod `.parse()`
- Add rate limiting middleware (memory-based, with stricter limits on auth endpoints)
- Add CSRF token generation and validation for cookie-based sessions
- Escape LIKE wildcard characters in search parameters
- Validate actual file content (magic bytes) on image upload endpoints, not just client-declared MIME type
- Set `SameSite=Strict` on session cookies via better-auth configuration

## Capabilities

### New Capabilities
- `input-validation`: Zod-based request body validation on all mutating endpoints
- `rate-limiting`: Per-IP rate limiting with configurable windows and thresholds
- `csrf-protection`: CSRF token generation and validation for cookie-based sessions

### Modified Capabilities
- `entity-permissions`: Visibility enforcement on read endpoints (currently only enforced on list endpoints via `buildVisibilityFilter`)
- `file-upload`: MIME type validation via magic bytes, not just declared Content-Type
- `search`: LIKE wildcard escaping on all search parameters

## Impact

- New file: `server/utils/validate.ts` — shared `validateBody` helper wrapping readBody + Zod
- New file: `server/utils/rate-limit.ts` — in-memory rate limiter
- New file: `server/utils/csrf.ts` — CSRF token generation/validation
- New file: `server/middleware/02.rate-limit.ts` — rate limiting middleware
- New file: `server/middleware/03.csrf.ts` — CSRF validation middleware
- New file: `server/utils/sanitize.ts` — LIKE wildcard escape utility
- Modified: all 69 POST/PUT/PATCH route files — add Zod schema + `validateBody` call
- Modified: `server/api/campaigns/[id]/entities/[slug]/index.get.ts` — add `canUserAccessEntity` check
- Modified: `server/api/campaigns/[id]/characters/[slug]/index.get.ts` — add visibility check
- Modified: `server/api/campaigns/[id]/locations/[slug].get.ts` — add visibility check
- Modified: `server/api/campaigns/[id]/sessions/[slug]/index.get.ts` — add visibility check (if sessions have visibility)
- Modified: `server/api/campaigns/[id]/entities/index.get.ts` — escape LIKE wildcards in search
- Modified: `server/api/campaigns/[id]/characters/index.get.ts` — escape LIKE wildcards in search
- Modified: `server/api/campaigns/[id]/locations/index.get.ts` — escape LIKE wildcards in search
- Modified: `server/api/campaigns/[id]/entities/[slug]/image.post.ts` — add magic-byte MIME validation
- Modified: `server/api/campaigns/[id]/characters/[slug]/portrait.post.ts` — add magic-byte MIME validation
- Modified: `server/api/campaigns/[id]/session-groups/[slug]/image.post.ts` — add magic-byte MIME validation
- Modified: `server/api/campaigns/[id]/images/index.post.ts` — add magic-byte MIME validation
- Modified: `server/api/campaigns/[id]/maps/[slug]/upload.post.ts` — add magic-byte MIME validation
- Modified: better-auth config — set `SameSite=Strict` on session cookies
- aleph-cli: No direct CLI changes required (CLI uses API key auth, not cookies; validation is server-side)
- Skill files: No updates needed (no new commands or changed command signatures)
