## Context

Aleph exposes a full REST API via Nuxt Nitro but has no CLI. Every operation requires either a browser or direct HTTP calls with manually managed auth cookies. The "CLI is the new MCP" pattern (oneuptime.com/blog/post/2026-02-03-cli-is-the-new-mcp) argues that a well-structured CLI with `--json` output, `--help` discoverability, and Unix exit codes is the most practical AI agent integration surface — more maintainable than custom MCP servers and usable by humans too.

The CLI lives as a separate package in `cli/` at the repo root. It talks to the Aleph server over HTTP using a long-lived API token. It does not embed the database or business logic — it is a thin HTTP client with UX polish.

## Goals / Non-Goals

**Goals:**
- Cover the core DM workflow: login, list/create/edit campaigns, manage entities, characters, sessions, search, roll dice
- `--json` on every command for machine-readable stdout (AI agent / pipeline use)
- `--help` tree fully describes all commands and options (AI agent discovery)
- Unix exit codes: 0 = success, 1 = usage error, 2 = API error
- Errors to stderr, data to stdout
- Config stored in `~/.aleph/config.json` (base URL + token)
- Works as `npx aleph-cli` or globally installed `aleph`

**Non-Goals:**
- Offline / direct DB access (CLI always goes through the HTTP API)
- Replicating every API endpoint (focus on high-value DM workflows)
- Interactive TUI (simple prompts only, not a full terminal UI)
- Managing maps, calendars, inventories (complex data — browser is better)
- Replacing the web app

## Decisions

### 1. `commander.js` as the CLI framework

**Decision:** Use `commander` (industry standard, ~55M weekly downloads) over `yargs`, `meow`, or `oclif`.

**Why:** Commander has the cleanest API for nested subcommands (`aleph campaign list`, `aleph entity create`), auto-generated `--help` output that AI agents can parse, and zero magic. Oclif is over-engineered for this scope. Yargs is fine but commander's builder pattern is more readable.

### 2. API token auth, not cookie session

**Decision:** Add a `POST /api/auth/token` endpoint that accepts email+password and returns a named long-lived token stored in the DB. The CLI sends `Authorization: Bearer <token>` on all requests.

**Why:** better-auth's cookie-based sessions are designed for browsers. Passing cookies from a CLI is awkward and fragile. A token endpoint follows standard API patterns, is revocable, and works in CI/CD. The token is stored in `~/.aleph/config.json` after `aleph login`.

**Alternative considered:** Re-use better-auth's `/api/auth/sign-in/email` and store the session cookie. Rejected: cookies expire unpredictably, the cookie jar path is nonstandard, and it conflates browser sessions with CLI sessions.

### 3. Separate `cli/` package at repo root

**Decision:** `cli/package.json` with `"name": "aleph-cli"`, its own dependencies, and `bin: { "aleph": "./bin/aleph.js" }`. Not embedded in the main Nuxt app.

**Why:** Keeps CLI dependencies (commander, chalk, ora, conf) out of the main app bundle. Allows independent versioning and publishing to npm. The CLI can be installed globally without installing the full Aleph stack.

### 4. `--json` flag on every command, human-friendly default

**Decision:** Default output is human-readable colored text (tables, formatted fields). `--json` outputs a JSON object/array to stdout with no decoration.

**Why:** Matches the pattern of `aws cli`, `gh`, `kubectl`. Humans get readable output; AI agents and scripts use `--json | jq`. The JSON shape mirrors the API response types already defined in `app/types/api.ts`.

### 5. Command structure

```
aleph config set --url <url> --token <token>
aleph config show
aleph login                          # prompts for email/password, stores token
aleph logout

aleph campaign list
aleph campaign create --name <name> [--description <desc>] [--theme <theme>]
aleph campaign show <id>
aleph campaign delete <id>

aleph entity list --campaign <id> [--type <type>] [--search <q>]
aleph entity create --campaign <id> --name <name> --type <type> [--content <md>]
aleph entity show --campaign <id> <slug>
aleph entity edit --campaign <id> <slug> --name <name> [--content <md>]
aleph entity delete --campaign <id> <slug>

aleph character list --campaign <id>
aleph character create --campaign <id> --name <name> [--class <class>]
aleph character show --campaign <id> <slug>

aleph session list --campaign <id>
aleph session create --campaign <id> --title <title> [--date <date>]
aleph session show --campaign <id> <slug>

aleph member list --campaign <id>
aleph member invite --campaign <id> --role <role>

aleph search --campaign <id> <query>
aleph roll --campaign <id> <formula>         # e.g. aleph roll --campaign abc 2d6+3
```

### 6. Token endpoint stored in better-auth's sessions table

**Decision:** Reuse the existing `sessions` table pattern from better-auth — create a row with a long expiry and a "cli" user-agent marker. Return the token as a plain string.

**Why:** Avoids a new DB table. Revocation works via existing session deletion. The CLI token is just a long-lived session with a distinct label.

## Risks / Trade-offs

- **Risk:** Token stored in plaintext in `~/.aleph/config.json` → **Mitigation:** Warn user on `aleph login`; use `600` permissions on the file; users can use env var `ALEPH_TOKEN` instead
- **Risk:** API changes break CLI → **Mitigation:** CLI targets the same codebase; treat them as co-versioned. Add CLI smoke tests to the integration test suite.
- **Risk:** `POST /api/auth/token` opens a new attack surface → **Mitigation:** Same rate-limiting and credential validation as the existing sign-in endpoint; tokens can be revoked via `aleph logout`
- **Trade-off:** CLI always requires a running Aleph server — can't work offline. Acceptable given goals (it's a remote management tool, not a local tool).

## Migration Plan

1. Add `POST /api/auth/token` server endpoint
2. Create `cli/` package with scaffold
3. Implement commands incrementally (config → login → campaigns → entities → characters → sessions → search/roll)
4. Add `"aleph-cli": "node cli/bin/aleph.js"` convenience script to root `package.json`
5. No DB migration needed (reuse sessions table)
6. No changes to existing frontend or API routes
