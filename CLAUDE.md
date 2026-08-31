# Aleph — Claude Code Project Guide

## Project

TTRPG Campaign Management Suite. Full-stack Nuxt 4 app (Vue 3, Nitro, SQLite via Drizzle ORM, better-auth, Hocuspocus, Tailwind, shadcn-vue).

- `app/` — pages, components, composables
- `server/api/` — Nitro API routes
- `server/db/schema/` — Drizzle schema + `server/db/migrations/`
- `server/middleware/01.auth.ts` — auth (cookie session + `X-API-Key`)
- `cli/` — aleph-cli Node.js CLI tool
- `tests/unit/`, `tests/integration/`, `tests/e2e/` — test suites
- `openspec/` — spec-driven development workflow

## Testing — always required

Every change must include tests at the appropriate levels. Skip a level only with a clear reason.

| Level       | Tool                          | When required                                                      |
| ----------- | ----------------------------- | ------------------------------------------------------------------ |
| Unit        | Vitest (`tests/unit/`)        | Any pure logic, utilities, DB helpers, composables                 |
| Integration | Vitest (`tests/integration/`) | Any server API endpoint or auth flow; requires server on port 3333 |
| E2E         | Playwright (`tests/e2e/`)     | Any user-facing flow (page, form, navigation)                      |

Run unit tests: `npx vitest run tests/unit/`
Run integration tests: `npx vitest run tests/integration/` (server must be running)
Run E2E tests: `npx playwright test`

### Starting the dev server — `STARTUP_BACKFILLS_ENABLED=false` is not optional locally

```bash
STARTUP_BACKFILLS_ENABLED=false npm run dev                 # port 3000
STARTUP_BACKFILLS_ENABLED=false npm run test:integration    # starts :3333 for you
```

Without that variable the boot-time index backfills run first, and a Nitro plugin's `await`
happens **before the server accepts a request** — on this project's own database that is over a
thousand entities to embed, so every route answers 503 (or, before `fix-dev-boot-native-addon`,
`500 Module did not self-register`) for minutes. The port is open the whole time, which is why the
failure reads as "the server never came up" and why two archived changes wrote that same wrong
diagnosis down and skipped their integration tests over it. **Wait on a real request
(`/api/health`), never on the port** — `curl` the health route until it answers, and treat the
`➜ Local:` banner as "Vite is up", not "the API is up". Full table of env vars and the reasoning:
`docs/development.md`.

**`nuxt dev` does NOT hot-reload `server/api/**` — a mutation check against a running server is
worthless.** Measured 2026-08-31: the original bug was restored in a route handler, the integration
suite was re-run twice (8s and 38s after the edit) and reported **15/15 green**, which reads as
"the tests do not catch this bug" and is false. After a server **restart** the same suite went
**6/15 red**. So when breaking something on purpose to prove a guard bites, restart the server
between the edit and the run, or you are testing the old code and will conclude the opposite of
the truth.

**And the FIRST Playwright run after a restart fails on cold page compilation, whatever the code
says.** In dev, a page is compiled on first request, so `/api/health` answering 200 says nothing
about `/register` being ready — three runs in a row failed on `waitForSelector('form')` at
`helpers.ts:51` and on `entity-search-input`, none of them for the reason under test, and the same
suite passed 2/2 immediately afterwards with no code change. Warm the pages first
(`curl -s -o /dev/null http://localhost:3333/register`) or discard the first run. When a test fails,
read WHICH LINE failed before concluding anything: a failure on the setup helper and a failure on
the assertion look identical in the summary and mean opposite things.

## aleph-cli — always check for impact

The `cli/` directory is a standalone Node.js CLI (`aleph-cli`) that talks to the server via `X-API-Key` headers.

**Before finishing any change, ask:** does this add or modify a server API endpoint, auth flow, or data model?

If yes, update:

- `cli/src/commands/` — relevant command file(s)
- `cli/src/lib/client.js` — if the HTTP interface changed
- `cli/src/lib/config.js` — if auth or config shape changed
- `docs/claude-skill.md` — the **shareable** skill (uses `aleph` / `npx aleph-cli`); installable by other projects via `curl`; always reflects the full public command surface
- `.claude/skills/aleph-cli/SKILL.md` — the **local** Claude Code skill (uses `node /Users/ludo/code/aleph/cli/bin/aleph.js`); must mirror `docs/claude-skill.md`; bump `version` in frontmatter when updated

Both skill files must be updated together whenever CLI commands change.

Auth: CLI stores `apiKey` + `apiKeyId` in `~/.aleph/config.json`. Sends `X-API-Key: <raw>` header. Keys are sha256-hashed server-side. Managed at `POST/GET/DELETE /api/apikeys`.

## i18n — canonical locale directory

The **only** locale directory that matters is `i18n/locales/` (project root). This is where `@nuxtjs/i18n` resolves files from: it combines `rootDir + restructureDir ("i18n") + langDir ("locales/")`.

**Always edit `i18n/locales/en.json` and `i18n/locales/es.json`** — never `locales/` or `app/i18n/locales/` (those are stale duplicates that may exist but are not loaded).

## openspec workflow

Use `/opsx:propose` to create a new change (generates proposal, design, specs, tasks).
Use `/opsx:apply` to implement tasks.
Use `/opsx:archive` when all tasks are done.

Config at `openspec/config.yaml` — rules there govern artifact generation.

## Tools

- Use `rg` (ripgrep) for searching code — it's installed and faster than grep.
- The built-in Grep tool is backed by ripgrep already, prefer it over shell `grep`.
