# Development guide

Everything you need to work on Aleph locally.

## Setup

Requires **Node 22+** and npm.

```bash
git clone https://github.com/LudoBermejoES/aleph.git
cd aleph
npm install --legacy-peer-deps
cp .env.example .env
npm run dev            # http://localhost:3000
```

### The `--legacy-peer-deps` requirement

Nuxt 4.4's own dependency tree has a `commander` version conflict (`@bomb.sh/tab` via `@nuxt/cli` wants `^13`, while `svgo@4` via `@nuxt/vite-builder` wants `^11`). A plain `npm ci` fails on it. Use `npm install --legacy-peer-deps` everywhere — locally **and in CI** (the deploy workflow already does). This is purely a Nuxt-internal quirk; it does not affect your application dependencies.

## Environment variables

`.env.example` is the reference. Minimum to boot: `BETTER_AUTH_SECRET`. Notable ones:

| Var                                            | Purpose                                                             |
| ---------------------------------------------- | ------------------------------------------------------------------- |
| `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL`       | auth (required)                                                     |
| `NITRO_PORT` / `NITRO_HOST`                    | server bind                                                         |
| `NUXT_PUBLIC_HOCUSPOCUS_URL`                   | collab WebSocket (default `ws://localhost:3334`)                    |
| `NUXT_PUBLIC_DIAGRAM_MULTIPLAYER`              | enable live diagram sync (`false` by default)                       |
| `NUXT_PUBLIC_SENTRY_DSN` / `SENTRY_AUTH_TOKEN` | error tracking (optional)                                           |
| `NUXT_BACKUP_R2_*`                             | Cloudflare R2 backups (optional) — see [backup.md](backup.md)       |
| AI provider vars                               | AI summary generation (optional)                                    |
| `STARTUP_BACKFILLS_ENABLED`                    | `false` skips the boot-time index backfills — local only, see below |

### If `nuxt dev` boots but every `/api/**` route answers 500

Two separate things bite here, and it is worth knowing which one you have.

**`Module did not self-register: .../onnxruntime_binding.node`.** `onnxruntime-node`'s native
addon cannot be `dlopen`'d twice in one process, and `server/services/embeddings.ts` used to
import `@huggingface/transformers` at module scope — which put it in the module graph of
everything that touches the file, including `server/plugins/watcher.ts`. In `nuxt dev` the
Nitro bundle loaded it once and the request-time graph loaded it again, and from then on
**every** API route answered 500, semantic search or not. The import is now deferred to first
use (`getEmbedder()`), so the addon is loaded once, by whichever graph actually needs an
embedding. If you see this error again, look for a new module-scope import of transformers.js.

**The server takes minutes to answer at all.** `server/plugins/watcher.ts` awaits its one-time
backfills, and a Nitro plugin's `await` runs before the server accepts a request. On a small or
fresh database that is milliseconds. On a working copy of a real campaign database it is not:
with ~1,500 entities still lacking an embedding the boot blocks long enough that
`npm run test:integration`'s `wait-on` gives up and the run reads as a red suite. Skip them:

```bash
STARTUP_BACKFILLS_ENABLED=false npm run dev
STARTUP_BACKFILLS_ENABLED=false npm run test:integration
```

Only the exact string `false` disables them, and only for that process — nothing is written,
no schema changes, and an index that was already incomplete simply stays that way. **Never set
it in production**: the backfills are the only thing that populates an index for content that
predates the feature. It is deliberately not baked into the `test:integration` script so CI
keeps exercising the default boot path.

The embedding backfill also **converges** now. An entity whose `filePath` points at a file that
no longer exists used to fail, be counted, and be selected again on the very next boot, for
ever. It is retried at most three times and then recorded in `entity_embedding_failures`. To
make it try again after fixing the underlying file:

```sql
DELETE FROM entity_embedding_failures WHERE entity_id = '<id>';
```

## Project layout

See [architecture.md](architecture.md#project-layout) for the annotated tree. The short version: `app/` is the Vue SPA, `server/` is everything else (API, services, DB, collab), `cli/` is the standalone CLI, `content/` and `data/` are runtime stores.

## Database workflow

Schema is code, in `server/db/schema/*.ts` (Drizzle). To change it:

```bash
# edit server/db/schema/<file>.ts
npm run db:generate    # writes a migration into server/db/migrations/
npm run db:migrate     # applies it
```

Migrations also apply automatically on server start.

> **Migration ordering gotcha:** Drizzle's `_journal.json` orders migrations by a `when` timestamp. If a new migration's timestamp is _earlier_ than an existing entry, it gets silently skipped. If a new migration won't apply, check the timestamp ordering in `_journal.json`.

## Testing

Three levels, all expected green:

```bash
npm run test:unit          # Vitest — pure logic; no server needed
npm run test:integration   # Vitest — API endpoints; auto-starts a dev server on :3333
npm run test:e2e           # Playwright — full flows; manages its own server
npm run test:all           # all three
```

Guidance:

- **Unit** (`tests/unit/`): any pure logic, utility, DB helper, or composable.
- **Integration** (`tests/integration/`): any API endpoint or auth flow. The `test:integration` script starts a server on **3333** for you via `start-server-and-test`.
- **E2E** (`tests/e2e/`): any user-facing flow. **Don't start a server manually — Playwright launches its own.**
- E2E flakiness is usually environmental (parallel runs, server start-up lag, shared DB state) rather than a real regression. When triaging a red E2E run, compare the failing set against a known-good baseline before assuming the change broke something — the failures often differ run-to-run.
- Pipe long test runs to a file under `logs/` and read it back to iterate, rather than re-running.

Every change should add or update tests at the appropriate level; skip a level only with a clear reason.

## Conventions & gotchas

- **i18n canonical dir:** the **only** locale directory that loads is `i18n/locales/` (project root). `@nuxtjs/i18n` resolves it as `rootDir + "i18n" + "locales/"`. Stale copies at `locales/` or `app/i18n/locales/` may exist but are **not** loaded — always edit `i18n/locales/en.json` and `i18n/locales/es.json`.
- **CLI impact:** any server endpoint / auth / data-model change should be reflected in `cli/` and in **both** skill docs (`docs/claude-skill.md` and `.claude/skills/aleph-cli/SKILL.md`) — see [cli.md](cli.md).
- **Themes:** `app/assets/css/themes.css` must be `@import`ed **above** the `@tailwind` directives in `main.css`; new theme fonts must be registered in `nuxt.config.ts` (`fonts.families`). See [theming.md](theming.md).
- **React-in-Nuxt:** the diagram layer compiles `.tsx` as React, not Vue — don't touch the `nuxt.config.ts` integration module casually. See [diagrams.md](diagrams.md).
- **Secrets never go in git:** `.env`, `~/.aleph/config.json`, and any credential stay local.
- **Formatting:** `npm run format` (Prettier). A Husky pre-commit hook runs lint-staged; a pre-push hook runs `format:check`.

## Spec-driven changes (OpenSpec)

Larger changes use the `openspec/` workflow — a proposal + design + spec + tasks per change, implemented and then archived. The slash-command flow is `/opsx:propose` → `/opsx:apply` → `/opsx:archive`. Config in `openspec/config.yaml`.
