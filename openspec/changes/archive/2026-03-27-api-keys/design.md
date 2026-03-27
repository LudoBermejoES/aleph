## Context

Currently the CLI uses `POST /api/cli/token` to exchange email+password for a session row with `userAgent: 'aleph-cli'`. This piggybacks on the browser session table and has no revocation UI, no labelling, and no way to have multiple keys with different purposes. The auth middleware already supports `Authorization: Bearer` for this flow.

The new system introduces a dedicated `api_key` table with proper lifecycle management (create, list, revoke), a settings UI, and replaces the `Authorization: Bearer` header with `X-API-Key`.

## Goals / Non-Goals

**Goals:**
- Users can create multiple named API keys (e.g. "aleph-cli", "home-automation", "CI")
- Keys are shown in full only once at creation; stored hashed (sha256) server-side
- Keys never expire unless explicitly revoked
- `X-API-Key` header accepted anywhere cookie sessions are accepted
- CLI `aleph login` creates an API key and stores it locally
- Settings page lets users view (prefix + name), create, and revoke keys
- Full test coverage: unit (hashing/validation), integration (endpoint flows), updated CLI tests

**Non-Goals:**
- Key scopes or permissions beyond "authenticated as this user" — all keys carry full user identity
- Key rotation (create + revoke is sufficient)
- Rate limiting per key (future concern)
- OAuth or third-party tokens

## Decisions

### 1. Separate `api_key` table, not reuse `session`

**Decision:** New `api_key` table in `server/db/schema/auth.ts`.

**Why:** Sessions have `expiresAt`, `ipAddress`, `userAgent` — semantics that don't fit permanent keys. A separate table makes queries, indexes, and schema evolution cleaner. Also avoids polluting better-auth's session management.

**Alternatives considered:**
- Reuse `session` with `userAgent: 'aleph-cli'` (current approach) — works but no label, no multi-key, no revocation UI
- Store in a separate `apiKeys` SQLite file — unnecessary complexity

### 2. Store key hashed (sha256), show raw only once

**Decision:** `key` column stores `sha256(rawKey)` as hex. Raw key returned only from the create endpoint, never stored.

**Why:** If the DB is compromised, keys cannot be used directly. sha256 is fast and sufficient for high-entropy random keys (64 hex chars = 256 bits entropy).

**Alternatives considered:**
- bcrypt — too slow for per-request auth middleware lookups
- Store plaintext — unacceptable security risk

### 3. Key format: `aleph_<64 hex chars>`

**Decision:** `aleph_` prefix + `crypto.randomBytes(32).toString('hex')` (64 chars).

**Why:** Prefix makes keys identifiable in logs/config files. 32 bytes = 256-bit entropy, impossible to brute-force. keyPrefix stored separately = first 8 chars after `aleph_`, shown in UI.

### 4. `X-API-Key` header, not `Authorization: Bearer`

**Decision:** Use `X-API-Key` header for API key auth.

**Why:** `Authorization: Bearer` is semantically a token and is already used by the current CLI session flow. Using a distinct header avoids ambiguity and is the conventional choice for API key auth (used by Stripe, GitHub, etc.). Easier to distinguish in middleware and logs.

### 5. Auth middleware: hash-then-lookup on every request

**Decision:** For each request with `X-API-Key`, compute `sha256(key)` and query `api_key` where `keyHash = ?` AND `revokedAt IS NULL`.

**Why:** No caching needed for SQLite at this scale. A single indexed query is fast. Update `lastUsedAt` asynchronously (fire-and-forget) to avoid blocking the request.

**Alternatives considered:**
- Cache valid keys in memory — adds complexity, invalidation issues on revoke

### 6. Remove `/api/cli/token` endpoints

**Decision:** Delete `token.post.ts` and `token.delete.ts` after migration.

**Why:** They are fully superseded. Keeping both creates confusion. The `aleph-cli` change is the only consumer, and it will be updated in the same PR.

## Risks / Trade-offs

- **lastUsedAt update on every request** → small write overhead per authenticated request. Mitigation: fire-and-forget (don't await), accept up-to-second staleness.
- **No key expiry** → a leaked key is valid forever until revoked. Mitigation: UI makes revocation trivial; document best practices.
- **sha256 not salted** → technically susceptible to rainbow tables, but key entropy (256 bits) makes this infeasible in practice.
- **Breaking change to CLI** → existing users with `Authorization: Bearer` tokens in `~/.aleph/config.json` will get 401s after upgrade. Mitigation: `aleph login` detects old config shape and prompts to re-login.

## Migration Plan

1. Add `api_key` table via Drizzle migration
2. Deploy server with new endpoints + updated middleware (both `X-API-Key` and old `Authorization: Bearer` work during transition)
3. Update CLI to use `X-API-Key` flow
4. Remove `/api/cli/token` endpoints once CLI is updated
5. Rollback: revert migration (drop `api_key` table) and restore token endpoints

## Open Questions

- Should there be a maximum number of keys per user? (Suggested default: 20, can be a server config)
- Should `lastUsedAt` be updated at all, or is it enough to know a key was created? (Current decision: yes, useful for auditing)
