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

### The test suites do NOT use `data/aleph.db` any more

`test:integration`, `test:e2e` and `test:all` go through `scripts/with-test-db.mjs`, which mints an
empty database under the OS temp dir (ext4 here, not the v9fs repo mount), exports
`ALEPH_DB_PATH`, runs the suite, and deletes the file — on failure and on Ctrl-C too.

**An empty file is a complete seed.** The boot plugins apply every migration and initialise the
lexical and vector indexes unconditionally, so there is no fixture to maintain and none to go stale.

Why it exists: the suites had grown `data/aleph.db` to **4.36 GB across 1,915 campaigns** — 4 real,
the rest leftovers — against production's **171 MB** with the same four. And the intuitive cleanup
does not work: deleting 1,729 leftover campaigns one at a time took 107 s and reclaimed **14 MB**,
while emptying the eight `entity_vectors*` **shadow** tables reclaimed **3.45 GB in 2.8 s**. **97% of
that file is `sqlite-vec` chunks**, allocated 1,024 slots at a time and never freed on delete, so the
growth is monotonic. To reduce a bloated one: empty those shadow tables (**excluding the two `vec0`
virtual tables by name** — `DROP`/`DELETE` on them fails with `no such module: vec0` without the
extension loaded), `VACUUM`, then let the boot backfill re-embed.

Two consequences worth knowing:

- **`resolveDbPath()` (`server/utils/db-path.ts`) is the only place that answers "which file".** Two
  integration tests used to compose the path by hand; left alone they would have read the
  development database while the server read the throwaway one — two databases in one run, with the
  assertions still passing.
- **It deliberately ignores `NODE_ENV`.** A rule like "temp database when `NODE_ENV=test`" means a
  stray variable in a shell silently points `npm run dev` at an empty database, which on a campaign
  wiki is indistinguishable from total data loss. Unset `ALEPH_DB_PATH` always means the real one.
- **A row count over "the database" measures the test fixtures, not the campaign.** Two agents got
  different answers to the same question on one afternoon (150 → 170 → 190 multi-image entities)
  because the suite was writing while they counted. Scope every count to a named campaign.

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

**A server route is NOT hot-reloaded by `nuxt dev`, so a mutation check against a running server is
worthless.** Measured 2026-08-31: the original bug was restored in a handler under `server/api/`,
the integration suite was re-run twice (8s and 38s after the edit) and reported 15/15 green — which
reads as "the tests do not catch this bug" and is false. After a server **restart** the same suite
went 6/15 red. So when breaking something on purpose to prove a guard bites, restart the server
between the edit and the run, or you are testing the old code and will conclude the opposite of the
truth.

**And the FIRST Playwright run after a restart fails on cold page compilation, whatever the code
says.** In dev, a page is compiled on first request, so `/api/health` answering 200 says nothing
about `/register` being ready — runs failed on `waitForSelector('form')` at `helpers.ts:51` and on
`entity-search-input`, none of them for the reason under test, and the same suite passed
immediately afterwards with no code change.

**`curl` does NOT warm a page, and this file said it did.** `/register` serves **3,461 bytes with
zero `<form>`** — it is client-rendered, so the form exists only once the client bundle runs, and
`curl` fetches the shell and never requests the chunks. Measured with a real browser: the form
appears after **21.6 s**, against the 15 s `waitForSelector` in `helpers.ts`. That gap is the whole
failure. Warm it by driving a browser (a throwaway `chromium.launch()` that visits `/register` and
waits for `form` with a long timeout — and run the script from inside the repo, or
`@playwright/test` will not resolve), then run the suite.

When a test fails, read WHICH LINE failed before concluding anything: a failure in the setup helper
and a failure in the assertion look identical in the summary and mean opposite things. That is how
a test failing on a 15 s cold compile was nearly filed as an intermittent product bug — and, on the
way to finding it, ~900 MB was reclaimed from an **orphaned Chromium tree alive 4 h 50 m** left by a
killed run, which was real garbage and was not the cause.

### 43 e2e flaky con una causa NO confirmada — no subas el timeout todavía

En `~/code/wod20` la suite e2e completa da **275 passed / 43 flaky / 0 failed** (1 h, exit 0): los
43 pasan al reintentar. El primer intento falla abrumadoramente en un solo sitio —
**`helpers.ts:105`, 88 apariciones**, la espera de `button:has-text("New Campaign")` — con 47
`Timeout 15000ms exceeded`.

**La explicación obvia es falsa y está medida.** La hipótesis era compilación en frío de la página,
como en el mount viejo. En ext4, `/register` monta su `form` **en 1,0 s** (contra 21,6 s en
`/mnt/c`), así que ahí no está el problema.

Y la medición que lo habría "confirmado" era inválida: una sonda a `/` **sin sesión** no ve nunca ese
botón, porque solo existe logueado — esperó 240 s y no apareció. Eso NO es un timeout lento, es la
página correcta sin la precondición.

Sospecha viva, sin confirmar: una **carrera de establecimiento de sesión** entre `registerAndLogin`
y `createCampaign`. Para confirmarla hace falta una sonda **con sesión** que cronometre la aparición
del botón tras el login. Hasta entonces **no se sube el timeout de `helpers.ts`**: subirlo sobre un
diagnóstico sin confirmar es la jugada de "arreglar el test", y si es una carrera, un timeout más
largo la esconde en vez de cerrarla.

### CI's `test` job is format + lint + unit, in that order

`npm run format:check` runs **before** the tests and fails the whole job, and `deploy` sits behind
`needs: [test, integration-test]`. A green `npx eslint` proves nothing about it — that is how a
correct change was blocked on 2026-08-31. Run `npm run format:check` before pushing.

Prettier will also rewrite prose it thinks is malformed: a `**` glob (`server/api/**`) inside a
**bold** span came back as `red\*\*`. Keep globs out of emphasis in Markdown.

### A red CLI integration suite on `/mnt/c` is usually the mount, not the code

Every `tests/integration/cli/**` test spawns `node cli/bin/aleph.js`. Measured on this WSL checkout:
**4.8 s, 8.0 s and 4.9 s for three consecutive bare `--version` calls**, against vitest's 5000 ms
per-test timeout. So those suites are a coin flip here and a full-suite run reported **37 failures**
that were all timeouts. Before believing any of it, **re-run the failing file alone** — the two
non-CLI files in that batch went 25/25 green in isolation, and two unit failures went 22/22.

## Entity types are per-campaign DATA, not a list in the code

There is no fixed set of entity types. `entity_types` holds one row per campaign
(`slug`, `name`, `icon`, `sortOrder`, `isBuiltin`), a DM can rename them through
`entity type-update`, and there is **no unique index on `(campaign_id, slug)`**. Any feature that
writes a type name into a query or a component drifts from the data the moment a campaign changes.
That is exactly how the diagram palette shipped a group queried as
`entities.type IN ('entity','wiki')` — two values no campaign has ever used, so it was empty for
the whole life of the feature while looking complete.

Three facts that bite anyone deriving from these types, all measured on `berlin-en-tinieblas`:

- **The declared set and the used set disagree in BOTH directions.** Declared and unused:
  `faction`, `event`, `note`. Used and never declared: `organization`, `arc` (13 real entities).
  Deriving from `entity_types` alone silently drops the second group.
- **Organizations have two spellings.** The `entity_types` slug is `faction`; the `entities.type`
  those rows carry is `organization`. Excluding one and not the other lists every organization twice.
- **Characters, organizations and quests have their own tables**; everything else — locations
  included — is just `entities` with a `type`. So "make X first-class like a location" means giving
  it UI treatment, not a table.

## Reading a list endpoint: check the envelope key, every time

They are not consistent, and the wrong key returns a plausible empty answer rather than an error:

| endpoint                      | rows live under | notes                    |
| ----------------------------- | --------------- | ------------------------ |
| `GET .../entities`            | `entities`      | plus `pagination`        |
| `GET .../characters`, `/maps` | `data`          | plus `meta`, 50 per page |
| `GET .../entity-types`        | bare array      |                          |

This cost real time three times in one session: `data` on `/entities` answered "0 entities" about a
campaign holding **372**; `?type=Item` (the display name) and `?type=item` both answered 0 because
that endpoint takes no such filter. **Always run a control query** — ask for something you know is
there — before reporting that something is absent.

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
