## 1. Database — api_key table

- [x] 1.1 Add `apiKey` table to `server/db/schema/auth.ts` with columns: `id`, `userId` (FK → user), `name`, `keyHash` (sha256 hex), `keyPrefix` (first 8 chars of raw key), `createdAt`, `lastUsedAt`, `revokedAt`
- [x] 1.2 Add index on `keyHash` for fast lookup in auth middleware
- [x] 1.3 Add `apiKeyRelations` (apiKey → user) to the schema relations
- [x] 1.4 Generate and run Drizzle migration: `npm run db:generate && npm run db:migrate`

## 2. Server — API key utility

- [x] 2.1 Create `server/utils/apiKey.ts` — export `generateApiKey()` returning `{ raw, hash, prefix }` using `crypto.randomBytes(32)` with `aleph_` prefix and sha256 hash
- [x] 2.2 Export `hashApiKey(raw: string): string` from the same file for use in auth middleware

## 3. Server — API endpoints

- [x] 3.1 Create `server/api/apikeys/index.post.ts` — authenticated, reads `{ name }` from body, calls `generateApiKey()`, inserts row, returns `{ id, name, key: raw, keyPrefix, createdAt }`
- [x] 3.2 Create `server/api/apikeys/index.get.ts` — authenticated, returns all non-deleted keys for the current user as `{ id, name, keyPrefix, createdAt, lastUsedAt, revokedAt }[]`
- [x] 3.3 Create `server/api/apikeys/[id].delete.ts` — authenticated, sets `revokedAt = new Date()` on the key if it belongs to current user; returns 404 if not found or not owned

## 4. Server — Auth middleware

- [x] 4.1 Update `server/middleware/01.auth.ts` — add `X-API-Key` check before the existing cookie session check: hash the header value, query `apiKey` table where `keyHash = ? AND revokedAt IS NULL`, set `event.context.user` if found
- [x] 4.2 Update `lastUsedAt` on the matched key row asynchronously (do not await — fire-and-forget)
- [x] 4.3 Remove the existing `Authorization: Bearer` check from `server/middleware/01.auth.ts`
- [x] 4.4 Delete `server/api/cli/token.post.ts` and `server/api/cli/token.delete.ts`

## 5. Frontend — API Keys settings section

- [x] 5.1 Create `app/components/ApiKeyList.vue` — displays a table of keys (name, prefix, createdAt, lastUsedAt, Revoke button); shows empty state when list is empty
- [x] 5.2 Create `app/components/ApiKeyCreateDialog.vue` — form with a name input and "Generate Key" button; on success shows a one-time modal with the raw key and a copy-to-clipboard button
- [x] 5.3 Create `app/composables/useApiKeys.ts` — `fetchApiKeys()`, `createApiKey(name)`, `revokeApiKey(id)` calling the new endpoints
- [x] 5.4 Add an "API Keys" section to the user settings page (find or create `app/pages/settings.vue`) that mounts `ApiKeyList` and `ApiKeyCreateDialog`
- [x] 5.5 Add i18n keys for all new UI strings in `app/i18n/locales/en.json` and `app/i18n/locales/es.json`

## 6. CLI — Update to use API keys

- [x] 6.1 Update `cli/src/commands/login.js` — after verifying credentials, call `POST /api/apikeys` with name `"aleph-cli"` and store the returned `key` (raw) in `~/.aleph/config.json` as `apiKey` (remove old `token` field)
- [x] 6.2 Update `cli/src/commands/logout.js` — call `DELETE /api/apikeys/<id>` to revoke the key (store `id` alongside `apiKey` in config), then clear config
- [x] 6.3 Update `cli/src/lib/client.js` — send `X-API-Key: <apiKey>` header instead of `Authorization: Bearer <token>`
- [x] 6.4 Update `cli/src/lib/config.js` — handle migration: if existing config has `token` but no `apiKey`, prompt user to re-login

## 7. Unit tests

- [x] 7.1 Add `tests/unit/utils/apiKey.test.ts` — test `generateApiKey()` format (`aleph_` prefix, 64 hex chars, correct hash), test `hashApiKey()` determinism and output format
- [x] 7.2 Add `tests/unit/api/apikeys.test.ts` — test create/list/revoke logic directly against in-memory DB; verify isolation between users

## 8. Integration tests

- [x] 8.1 Update `tests/integration/cli.test.ts` — replace all `POST /api/cli/token` calls with `POST /api/apikeys`; replace `Authorization: Bearer` headers with `X-API-Key`
- [x] 8.2 Add integration test: create key → use it → revoke it → verify 401 after revocation
- [x] 8.3 Add integration test: `GET /api/apikeys` returns only the current user's keys (not another user's)
- [x] 8.4 Add integration test: `POST /api/cli/token` returns 404 (old endpoint removed)

## 9. Verify

- [x] 9.1 Run `npm run test:unit` — all unit tests pass (472 pass)
- [x] 9.2 Run `npm run test:integration` — all integration tests pass (requires server on port 3333)
- [ ] 9.3 Manual smoke test: `aleph login` → stores `apiKey` in `~/.aleph/config.json` → `aleph campaign list` succeeds using `X-API-Key` header
- [ ] 9.4 Manual smoke test: settings page shows API Keys section, key can be generated and revoked
- [ ] 9.5 Run `npm run build` — no type errors
