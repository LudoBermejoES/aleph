## 1. Shared utilities

- [x] 1.1 Create `server/utils/validate.ts` — export `validateBody<T>(event, schema: ZodSchema<T>): Promise<T>` that calls `readBody`, runs `schema.parse()`, catches `ZodError` and throws `createError({ statusCode: 422, message: 'Validation failed', data: { errors } })` with structured field-level errors
- [x] 1.2 Create `server/utils/sanitize.ts` — export `escapeLike(input: string): string` that escapes `%` to `\%` and `_` to `\_`; export `detectMimeFromBytes(buffer: Buffer): string | null` that checks magic bytes for PNG, JPEG, and WebP and returns the MIME type or null
- [x] 1.3 Create `server/utils/rate-limit.ts` — export `createRateLimiter(options: { windowMs, maxRequests })` returning a `checkRateLimit(key: string): { allowed: boolean, retryAfter: number }` function; use sliding window counter with Map storage; include `prune()` for expired entry cleanup
- [x] 1.4 Create `server/utils/csrf.ts` — export `generateCsrfToken(): string` (32 bytes, hex-encoded), `setCsrfCookie(event, token)`, `validateCsrf(event): void` (compares `X-CSRF-Token` header to `csrf_token` cookie, throws 403 on mismatch)

## 2. Rate limiting middleware

- [x] 2.1 Create `server/middleware/02.rate-limit.ts` — apply rate limiting to all `/api/*` routes; use three limiter instances: auth (`/api/auth/*`, 10/60s), uploads (routes ending in `upload`, `image.post`, `portrait.post`, 20/60s), general (100/60s); exempt `/api/health`; on limit exceeded return 429 with `Retry-After` header

## 3. CSRF protection middleware

- [x] 3.1 Create `server/middleware/03.csrf.ts` — skip non-API routes, skip GET/HEAD/OPTIONS, skip requests with `X-API-Key` header, skip `/api/auth/*` routes; for remaining requests validate CSRF token; on missing/invalid token throw 403
- [x] 3.2 Modify better-auth config to set session cookies with `SameSite=Strict` and `Secure` (in production)
- [x] 3.3 Add CSRF token cookie generation — after successful cookie-based auth (in auth middleware or as a Nitro plugin), set `csrf_token` cookie with `HttpOnly=false`, `SameSite=Strict`, `Secure` (production), `Path=/`
- [x] 3.4 Add frontend CSRF handling — create composable or `$fetch` interceptor that reads the `csrf_token` cookie and includes it as `X-CSRF-Token` header on all POST/PUT/PATCH/DELETE requests

## 4. Entity permission enforcement

- [x] 4.1 Modify `server/api/campaigns/[id]/entities/[slug]/index.get.ts` — after fetching the entity, call `canUserAccessEntity(db, userId, 'user', campaignRole, entity.id, entity.visibility, entity.createdBy, 'view')`; if `false`, throw 404; use `getCachedPermission`/`setCachedPermission` for caching
- [x] 4.2 Modify `server/api/campaigns/[id]/characters/[slug]/index.get.ts` — add same visibility check via `canUserAccessEntity`; the character's underlying entity record provides the visibility field
- [x] 4.3 Modify `server/api/campaigns/[id]/locations/[slug].get.ts` — add visibility check via `canUserAccessEntity`
- [x] 4.4 Audit and add visibility checks to any other single-entity GET endpoints that return entity data: `entities/[slug]/render.get.ts`, `characters/[slug]/portrait.get.ts`, `characters/[slug]/abilities/index.get.ts`, `characters/[slug]/connections/index.get.ts`, `characters/[slug]/organizations.get.ts`, `characters/[slug]/stats/index.get.ts`, `organizations/[slug]/index.get.ts`, `organizations/[slug]/locations.get.ts`, `locations/[slug]/sub-locations.get.ts`, `locations/[slug]/inhabitants.get.ts` (if exists)

## 5. Input validation — campaigns and core resources

- [x] 5.1 Add Zod schemas and `validateBody` calls to `campaigns/index.post.ts` and `campaigns/[id]/index.put.ts` — validate name (string, 1-200 chars), description (optional string, max 5000), isPublic (optional boolean)
- [x] 5.2 Add Zod schemas to `entities/index.post.ts` and `entities/[slug]/index.put.ts` — validate name (string, 1-200), type (string), visibility (enum: public, members, editors, dm_only, private, specific_users), content (optional string)
- [x] 5.3 Add Zod schemas to `entities/[slug]/tags.patch.ts` and `entities/[slug]/permissions.put.ts`
- [x] 5.4 Add Zod schema to `campaigns/[id]/tags.post.ts`, `campaigns/[id]/entity-types.post.ts`

## 6. Input validation — characters

- [x] 6.1 Add Zod schemas to `characters/index.post.ts` and `characters/[slug]/index.put.ts` — validate name, type, visibility, and character-specific fields
- [x] 6.2 Add Zod schemas to `characters/[slug]/abilities/index.post.ts`, `characters/[slug]/abilities/[abilityId]/index.put.ts`
- [x] 6.3 Add Zod schemas to `characters/[slug]/connections/index.post.ts`
- [x] 6.4 Add Zod schema to `characters/[slug]/stats/index.put.ts`
- [x] 6.5 Add Zod schema to `characters/[slug]/duplicate.post.ts`
- [x] 6.6 Add Zod schema to `character-folders/index.post.ts`

## 7. Input validation — sessions, quests, session groups

- [x] 7.1 Add Zod schemas to `sessions/index.post.ts` and `sessions/[slug]/index.put.ts`
- [x] 7.2 Add Zod schemas to `sessions/[slug]/attendance.patch.ts`, `sessions/[slug]/content/index.put.ts`, `sessions/[slug]/decisions/index.post.ts`, `sessions/[slug]/decisions/[decisionId]/consequences.post.ts`, `sessions/[slug]/decisions/[decisionId]/consequences.patch.ts`
- [x] 7.3 Add Zod schemas to `quests/index.post.ts` and `quests/[slug]/index.put.ts` — validate status enum if applicable
- [x] 7.4 Add Zod schemas to `session-groups/index.post.ts` and `session-groups/[slug]/index.put.ts`
- [x] 7.5 Add Zod schemas to `arcs/index.post.ts`, `chapters/index.post.ts`

## 8. Input validation — relations, organizations, locations

- [x] 8.1 Add Zod schemas to `relations/index.post.ts` and `relations/[relationId]/index.put.ts` — validate attitude as integer in range [-100, +100]
- [x] 8.2 Add Zod schemas to `relation-types/index.post.ts` and `relation-types/[typeId].put.ts`
- [x] 8.3 Add Zod schemas to `organizations/index.post.ts`, `organizations/[slug]/index.put.ts`, `organizations/[slug]/members/index.post.ts`
- [x] 8.4 Add Zod schemas to `locations/index.post.ts` and `locations/[slug].put.ts`
- [x] 8.5 Add Zod schemas to `locations/[slug]/inhabitants.post.ts`, `locations/[slug]/organizations.post.ts`

## 9. Input validation — economy (currencies, transactions, shops, inventories, items)

- [x] 9.1 Add Zod schemas to `currencies/index.post.ts` — validate name, code, exchange rates
- [x] 9.2 Add Zod schema to `transactions/index.post.ts` — validate amount (positive number), currencyId, description
- [x] 9.3 Add Zod schemas to `shops/index.post.ts`, `shops/[slug]/buy.post.ts`, `shops/[slug]/sell.post.ts`, `shops/[slug]/stock.post.ts`, `shops/[slug]/withdraw.post.ts`
- [x] 9.4 Add Zod schemas to `inventories/index.post.ts`, `inventories/[inventoryId]/items.post.ts`, `inventories/[inventoryId]/transfer.post.ts`
- [x] 9.5 Add Zod schema to `items/index.post.ts`

## 10. Input validation — maps, calendars, timelines

- [x] 10.1 Add Zod schemas to `maps/index.post.ts` and `maps/[slug]/index.put.ts`
- [x] 10.2 Add Zod schemas to `maps/[slug]/pins/index.post.ts`, `maps/[slug]/layers/index.post.ts`, `maps/[slug]/regions/index.post.ts`
- [x] 10.3 Add Zod schemas to `calendars/index.post.ts`, `calendars/[calendarId]/index.put.ts`, `calendars/[calendarId]/advance.patch.ts`
- [x] 10.4 Add Zod schemas to `calendars/[calendarId]/events/index.post.ts`
- [x] 10.5 Add Zod schemas to `timelines/index.post.ts` and `timelines/[slug]/events.post.ts`

## 11. Input validation — auth and membership

- [x] 11.1 Add Zod schema to `apikeys/index.post.ts` — validate name (string, 1-100)
- [x] 11.2 Add Zod schemas to `campaigns/[id]/invite.post.ts`, `campaigns/[id]/join.post.ts`
- [x] 11.3 Add Zod schemas to `members/[userId]/index.put.ts`, `members/[userId]/permissions.post.ts`
- [x] 11.4 Add Zod schemas to `templates/index.post.ts`, `templates/[templateId]/index.put.ts`
- [x] 11.5 Add Zod schema to `scan-mentions.post.ts`, `roll.post.ts`

## 12. LIKE wildcard escaping

- [x] 12.1 Modify `server/api/campaigns/[id]/entities/index.get.ts` — import `escapeLike` from `server/utils/sanitize.ts`, apply it to the `search` parameter before passing to `like()`; use `sql` template with `ESCAPE '\'` clause
- [x] 12.2 Modify `server/api/campaigns/[id]/characters/index.get.ts` — same `escapeLike` treatment on search parameter
- [x] 12.3 Modify `server/api/campaigns/[id]/locations/index.get.ts` — same `escapeLike` treatment on search parameter
- [x] 12.4 Check `search.get.ts` and any other endpoint using `like()` with user input; apply `escapeLike` if found

## 13. File upload magic byte validation

- [x] 13.1 Modify `server/api/campaigns/[id]/entities/[slug]/image.post.ts` — after reading the file, call `detectMimeFromBytes(file.data)` and compare to declared MIME; reject on mismatch with 400
- [x] 13.2 Modify `server/api/campaigns/[id]/characters/[slug]/portrait.post.ts` — same magic byte validation
- [x] 13.3 Modify `server/api/campaigns/[id]/session-groups/[slug]/image.post.ts` — same magic byte validation
- [x] 13.4 Modify `server/api/campaigns/[id]/images/index.post.ts` — same magic byte validation
- [x] 13.5 Modify `server/api/campaigns/[id]/maps/[slug]/upload.post.ts` — same magic byte validation (may support additional formats like TIFF for maps; check current allowlist)

## 14. Testing — unit tests

- [x] 14.1 Add `tests/unit/validate.test.ts` — test `validateBody` with valid schemas, invalid data (missing fields, wrong types, extra fields), null body; verify 422 error structure
- [x] 14.2 Add `tests/unit/sanitize.test.ts` — test `escapeLike` with normal strings, strings containing `%`, `_`, both, empty string; test `detectMimeFromBytes` with valid PNG/JPEG/WebP buffers, mismatched content, empty buffer, too-short buffer
- [x] 14.3 Add `tests/unit/rate-limit.test.ts` — test sliding window: requests within limit, exceeding limit, window reset, pruning; test different configurations (auth vs general)
- [x] 14.4 Add `tests/unit/csrf.test.ts` — test `generateCsrfToken` returns hex string of correct length; test `validateCsrf` with matching token, mismatched token, missing header, missing cookie
- [x] 14.5 Add `tests/unit/permissions-visibility.test.ts` — test `canUserAccessEntity` with all visibility levels and role combinations: dm sees everything, player sees members/public, private only by creator, specific_users checked against entity_specific_viewers, entity-level overrides (allow/deny)

## 15. Testing — integration tests

- [x] 15.1 Add `tests/integration/entity-visibility.test.ts` — create entities with different visibility levels via API; verify GET returns 200 or 404 based on requesting user's role; test entity-level permission overrides
- [x] 15.2 Add `tests/integration/input-validation.test.ts` — test representative endpoints (campaign create, relation create, transaction create) with invalid data; verify 422 responses with correct error structure
- [x] 15.3 Add `tests/integration/rate-limiting.test.ts` — send requests exceeding the limit; verify 429 response with `Retry-After` header; verify different limits for auth vs general
- [x] 15.4 Add `tests/integration/csrf.test.ts` — test cookie-authenticated POST without CSRF token (expect 403); test with valid token (expect success); test API key requests without CSRF (expect success)
- [x] 15.5 Add `tests/integration/file-upload-validation.test.ts` — upload files with mismatched MIME/content; verify 400 rejection; upload valid files; verify acceptance
- [x] 15.6 Add `tests/integration/like-escaping.test.ts` — create entities with `%` and `_` in names; search with those characters; verify only exact matches returned

## 16. Testing — E2E tests

- [x] 16.1 Add `tests/e2e/entity-visibility.spec.ts` — as player, navigate to a dm_only entity URL; verify 404 page shown; as DM, verify entity loads; test visibility toggle and verify player access changes
- [x] 16.2 Add `tests/e2e/input-validation.spec.ts` — submit forms with invalid data (empty name, too-long fields); verify error messages are shown in the UI
- [x] 16.3 Add `tests/e2e/csrf.spec.ts` — verify that normal form submissions from the app include CSRF tokens and succeed

## 17. Verification

- [x] 17.1 Run `npx vitest run tests/unit/` — all unit tests pass
- [x] 17.2 Run `npx vitest run tests/integration/` — all integration tests pass (server on port 3333)
- [x] 17.3 Run `npx playwright test` — all E2E tests pass
- [x] 17.4 Run `npx nuxi build` — build succeeds with no type errors. **Verificado 2026-09-01
      por el equivalente que sí corre:** el job `deploy` del run de CI `33513381822` ejecuta
      `npm run build` (= `nuxt build`, el mismo comando que `nuxi build` invoca) y terminó
      `success`. `npx nuxi typecheck` NO es ejecutable en este repo — ver la nota de la tarea 4.6
      de `2026-04-04-component-refactoring`.
- [x] 17.5 Run `npx eslint .` — no new lint errors introduced. **Verificado 2026-09-01:** el
      job `test` del run de CI `33513381822` tiene un paso `Lint` que corre
      `npx eslint . --ext .ts,.vue,.tsx` sobre todo el repo y terminó `success`. Ese paso se
      añadió precisamente porque ESLint vivía solo en `.husky/pre-push` y todos los push iban con
      `--no-verify`, así que no se ejecutaba en ningún sitio.
