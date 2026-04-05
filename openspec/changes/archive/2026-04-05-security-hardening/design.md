## Context

Aleph is a multi-user TTRPG campaign management app with role-based access control (dm, co_dm, editor, player, visitor). The permission infrastructure is well-designed: `server/utils/permissions.ts` exports `canUserAccessEntity()` which resolves entity-level overrides, role-based overrides, and visibility defaults. The `buildVisibilityFilter()` function is used by list endpoints to filter entities by visibility. However, individual GET endpoints (entity detail, character detail, location detail) skip visibility checks entirely — they fetch by campaignId + slug and return the result regardless of the requesting user's role or the entity's visibility setting.

All 69 mutating endpoints call `readBody(event)` and trust the raw body. Zod is already in `package.json` (used by better-auth internally) but is not used for request validation anywhere in the app code.

There is no rate limiting infrastructure. The auth middleware (`server/middleware/01.auth.ts`) processes every API request but has no throttling. The login endpoint is handled by better-auth's catch-all route (`server/api/auth/[...all].ts`), meaning brute force is unbounded.

Search endpoints (`entities/index.get.ts`, `characters/index.get.ts`, `locations/index.get.ts`) interpolate the `search` query parameter directly into `like(entities.name, '%${search}%')` without escaping `%` and `_` characters.

Image upload endpoints check `file.type` (client-declared MIME) against an allowlist but do not verify actual file content via magic bytes.

## Goals / Non-Goals

**Goals:**

- Enforce entity visibility on all single-entity GET endpoints using existing `canUserAccessEntity`
- Add Zod validation to all 69 POST/PUT/PATCH endpoints via a shared utility
- Add per-IP rate limiting with stricter thresholds on auth endpoints
- Add CSRF protection for cookie-based browser sessions
- Escape LIKE wildcards in search parameters
- Validate file uploads via magic bytes, not just declared MIME type
- Set `SameSite=Strict` on session cookies

**Non-Goals:**

- WAF or CDN-level protection (infrastructure concern, not app-level)
- Content Security Policy headers (separate change)
- SQL injection prevention beyond LIKE escaping (Drizzle ORM already parameterizes queries)
- Encryption at rest
- Audit logging (separate change)
- API key rate limiting per key (only per-IP for now)
- WebSocket rate limiting (Hocuspocus has its own connection handling)

## Decisions

### Decision 1: Entity visibility enforcement via `canUserAccessEntity`

The `canUserAccessEntity` function already exists and handles the full resolution chain (user override > role override > visibility default). Single-entity GET endpoints will call it before returning data.

**Alternative considered:** Duplicate the `buildVisibilityFilter` SQL logic inline in each GET endpoint. Rejected because `canUserAccessEntity` already encapsulates the logic including `entity_specific_viewers` checks, and duplicating SQL conditions would be error-prone.

**Implementation:** Each GET `[slug]` endpoint will call `canUserAccessEntity(db, userId, 'user', campaignRole, entity.id, entity.visibility, entity.createdBy, 'view')`. On `false`, return 403 (or 404 to avoid leaking existence — Decision 1a).

**Decision 1a: Return 404, not 403, for invisible entities.** Returning 403 reveals that the entity exists. Returning 404 is the safer default. DMs and co_dm bypass visibility entirely (already handled in `canUserAccessEntity`).

### Decision 2: Shared `validateBody` utility with Zod

Create `server/utils/validate.ts` exporting `validateBody<T>(event, schema: ZodSchema<T>): Promise<T>`. It calls `readBody(event)`, runs `schema.parse()`, and on `ZodError` throws a 422 with structured field errors.

**Alternative considered:** Use h3's built-in `readValidatedBody` with Zod. This is viable but gives less control over error formatting. We prefer a custom wrapper for consistent error shape across all endpoints: `{ statusCode: 422, message: 'Validation failed', data: { errors: [...] } }`.

**Alternative considered:** Middleware-based validation using route metadata. Rejected because Nitro route metadata is limited and schemas would be disconnected from the handler code.

### Decision 3: In-memory rate limiting with sliding window

Use an in-memory Map-based sliding window counter. No external dependency (Redis, etc.) needed since Aleph runs as a single Nitro process on a single server.

**Configuration:**

- General API: 100 requests per 60 seconds per IP
- Auth endpoints (`/api/auth/*`): 10 requests per 60 seconds per IP
- File uploads: 20 requests per 60 seconds per IP

**Alternative considered:** `rate-limiter-flexible` npm package. Rejected to avoid adding a dependency for something achievable with ~50 lines of code in a single-process app.

**Alternative considered:** Token bucket algorithm. Sliding window is simpler to implement and reason about for this use case.

**Cleanup:** Expired entries are pruned on each request (amortized O(1) per IP).

### Decision 4: CSRF protection via double-submit cookie pattern

Use the double-submit cookie pattern: server sets a `csrf_token` cookie (HttpOnly=false, SameSite=Strict), and mutating requests must include the token value in an `X-CSRF-Token` header. The middleware compares the cookie value to the header value.

**Scope:** Only applies to cookie-authenticated requests. API key requests (CLI, external integrations) are exempt — they do not use cookies and are not vulnerable to CSRF.

**Alternative considered:** Synchronizer token pattern (store token server-side in session). Rejected because better-auth does not expose a convenient session store hook, and the double-submit pattern is sufficient when combined with `SameSite=Strict`.

**Alternative considered:** Origin/Referer header checking. Less reliable (proxies strip Referer) and less standard than token-based CSRF.

### Decision 5: LIKE wildcard escaping utility

Create `server/utils/sanitize.ts` exporting `escapeLike(input: string): string` that replaces `%` with `\%` and `_` with `\_`. The three affected list endpoints will call this before constructing the `like()` condition. Drizzle's `like()` supports the `ESCAPE` clause via raw SQL when needed, but SQLite's default LIKE already treats `\%` and `\_` as literals when using the `ESCAPE '\'` clause.

**Alternative considered:** Strip wildcards entirely. Rejected because users might legitimately search for names containing `_` (e.g., "Zak_the_Bold").

### Decision 6: Magic byte validation for file uploads

Check the first bytes of uploaded files against known magic byte signatures for PNG (`89 50 4E 47`), JPEG (`FF D8 FF`), and WebP (`52 49 46 46 ... 57 45 42 50`). Reject files whose magic bytes don't match the declared MIME type.

**Implementation:** Add a `detectMimeFromBytes(buffer: Buffer): string | null` function to `server/utils/sanitize.ts`. Upload handlers call it and compare against the declared type.

**Alternative considered:** `file-type` npm package. Viable but adds a dependency for checking only 3 formats. A ~20-line function suffices.

### Decision 7: SameSite=Strict on session cookies

Configure better-auth's cookie settings to use `SameSite=Strict`. This prevents the browser from sending session cookies on cross-origin requests, which is the first line of defense against CSRF.

**Trade-off:** `SameSite=Strict` means links from external sites (e.g., Discord sharing a campaign URL) will not carry the session cookie on the first navigation. The user will appear logged out on arrival but will be logged in after any subsequent navigation. This is acceptable for a campaign management tool.

## Migration Plan

No database migrations required. All changes are application-level:

1. **Phase 1 — Utilities:** Create `validate.ts`, `rate-limit.ts`, `csrf.ts`, `sanitize.ts`
2. **Phase 2 — Middleware:** Add rate limiting and CSRF middleware
3. **Phase 3 — Entity permissions:** Add visibility checks to GET detail endpoints
4. **Phase 4 — Input validation:** Add Zod schemas to all mutating endpoints (can be done incrementally by resource)
5. **Phase 5 — Search + uploads:** Escape LIKE wildcards, add magic byte validation
6. **Phase 6 — Cookie config:** Set SameSite=Strict in better-auth config

All phases are independently deployable. No breaking changes to the API contract (valid requests continue to work; only invalid/unauthorized requests are newly rejected).

## Risks / Trade-offs

- [In-memory rate limiting resets on server restart] Acceptable for a single-user/small-team app. If Aleph ever moves to multi-process or serverless, rate limiting would need an external store.
- [SameSite=Strict breaks deep-link login state] Users arriving via external links will need one extra click. Acceptable trade-off for CSRF protection.
- [422 errors on previously-accepted invalid payloads] Existing clients sending malformed data will start getting rejected. This is intentional — the data was silently wrong before.
- [Performance overhead of per-request permission checks on GET] `canUserAccessEntity` does up to 2 DB queries (user override + role override). Mitigated by the existing LRU permission cache (`getCachedPermission` / `setCachedPermission` in `server/utils/permissions.ts`).
- [CSRF token management complexity] Frontend composables need to read the CSRF cookie and include it in fetch headers. Can be centralized in a `useFetch` wrapper or Nitro plugin.
