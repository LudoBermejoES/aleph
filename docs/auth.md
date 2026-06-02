# Authentication, roles & permissions

Aleph serves two kinds of clients — browsers and scripts — so it supports two kinds of credentials behind one middleware.

## Dual auth: cookie session OR API key

Every request except `/api/auth/*` (better-auth's own routes) and `/api/health` passes through `server/middleware/01.auth.ts`, which accepts **either**:

### 1. `X-API-Key` header (CLI / automation)

- The client sends `X-API-Key: <raw-key>`.
- The server hashes it (`sha256`) and looks it up in the `apiKey` table (keys are stored hashed, never in plaintext).
- On match, it joins to `user`, attaches the user to `event.context.user`, and updates `lastUsedAt` fire-and-forget.

This is how the [`aleph` CLI](cli.md) and CI talk to the server — no browser, no cookies.

### 2. better-auth cookie session (browser)

- Falls back to `auth.api.getSession()` using the request's `better-auth.session_token` cookie.
- Augments the session with the user's role from the `user` table.
- Sets a CSRF cookie if one isn't present.

Either path ends the same way: a resolved user on `event.context`, which downstream handlers use for permission checks.

### Managing API keys

API keys are created and revoked via `POST` / `GET` / `DELETE /api/apikeys`. The CLI's `login` command creates one and stores it (plus its id) in `~/.aleph/config.json`; `logout` revokes and clears it.

## The role model

Roles are **per campaign**, stored in `campaignMembers`, ordered by power:

```
dm (5) > co_dm (4) > editor (3) > player (2) > visitor (1)
```

- **dm / co_dm / editor** can edit content (including collaborative edits over Hocuspocus).
- **player / visitor** are read-only for content.

The same ordering drives **secret blocks**: `:::secret{.dm}` content is stripped on the server for anyone below the named role (see [content-model.md](content-model.md)). Because filtering happens server-side, lower roles never receive the hidden bytes — it's real access control, not a client-side hide.

## Entity visibility

Independent of secret blocks, each entity has a `visibility` frontmatter field. A `dm_only` entity returns 404 to players entirely. Visibility is enforced in the API/content layer before content is serialized.

## Where it lives

| Concern                        | Location                                                    |
| ------------------------------ | ----------------------------------------------------------- |
| Auth middleware                | `server/middleware/01.auth.ts`                              |
| better-auth config             | `server/utils/auth.ts`                                      |
| Auth tables (users, API keys)  | `server/db/schema/auth.ts`                                  |
| API key endpoints              | `server/api/apikeys/`                                       |
| WS auth token (for Hocuspocus) | `server/routes/.../ws token`, `server/services/ws-token.ts` |
| Secret-block stripping         | `server/services/remark-strip-secrets.ts`                   |
| CLI auth flow                  | `cli/src/commands/login.js`, `cli/src/lib/config.js`        |
