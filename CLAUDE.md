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

| Level | Tool | When required |
|-------|------|---------------|
| Unit | Vitest (`tests/unit/`) | Any pure logic, utilities, DB helpers, composables |
| Integration | Vitest (`tests/integration/`) | Any server API endpoint or auth flow; requires server on port 3333 |
| E2E | Playwright (`tests/e2e/`) | Any user-facing flow (page, form, navigation) |

Run unit tests: `npx vitest run tests/unit/`
Run integration tests: `npx vitest run tests/integration/` (server must be running)
Run E2E tests: `npx playwright test`

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

## i18n — always update all three copies

There are three locale directories that must always be kept in sync. **All i18n changes must be applied to all three:**

- `locales/` — loaded by Nuxt i18n at runtime (`langDir: 'locales/'` in `nuxt.config.ts`)
- `app/i18n/locales/` — used by the app build
- `i18n/locales/` — also loaded by Nitro at build time

If you add or change any key in one, copy the same change to the other two. Failing to do so causes `ENOENT` errors at startup.

## openspec workflow

Use `/opsx:propose` to create a new change (generates proposal, design, specs, tasks).
Use `/opsx:apply` to implement tasks.
Use `/opsx:archive` when all tasks are done.

Config at `openspec/config.yaml` — rules there govern artifact generation.
