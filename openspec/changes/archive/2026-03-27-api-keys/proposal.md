## Why

The current CLI authentication uses a session token tied to the `session` table, which is designed for browser sessions — not programmatic API access. Users need stable, named, revocable API keys they can generate once and use in scripts, CI, AI agents, and the aleph-cli without storing their password anywhere.

## What Changes

- New `api_key` table stores user-owned keys (hashed sha256, with a visible prefix for identification)
- Raw key shown only once at creation time, format: `aleph_<64 random hex chars>`
- Three new server endpoints: create, list, revoke API keys
- Auth middleware extended to accept `X-API-Key` header alongside existing cookie sessions
- New "API Keys" section in the user settings UI for managing keys
- `aleph login` CLI command updated to create an API key (instead of a CLI session token)
- CLI client updated to send `X-API-Key` header instead of `Authorization: Bearer`
- **BREAKING**: `POST /api/cli/token` and `DELETE /api/cli/token` removed — replaced by the generic API key endpoints
- Existing CLI integration tests updated to use the new flow

## Capabilities

### New Capabilities

- `api-key-management`: Server-side API key lifecycle — DB schema, create/list/revoke endpoints, and auth middleware support for `X-API-Key` header
- `api-key-settings-ui`: Settings page section for users to generate named keys, view the list (name, prefix, created, last used), and revoke keys

### Modified Capabilities

- `auth-roles`: Auth middleware now also accepts `X-API-Key` in addition to cookie sessions

## Impact

- **DB**: New migration adding `api_key` table
- **Server**: `server/db/schema/auth.ts`, new `server/api/apikeys/` endpoints, `server/middleware/01.auth.ts`
- **Frontend**: New component or section in user settings page
- **CLI**: `cli/src/commands/login.js`, `cli/src/lib/client.js`, `cli/src/lib/config.js`
- **Removed**: `server/api/cli/token.post.ts`, `server/api/cli/token.delete.ts`
- **Tests**: `tests/integration/cli.test.ts` updated; new unit tests for key hashing/validation
