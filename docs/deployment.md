# Deployment

Aleph is a single Node process plus a SQLite file and a content directory. It's designed to self-host cheaply.

## Build & run

```bash
npm install --legacy-peer-deps
npm run build                 # nuxt build → .output/
node .output/server/index.mjs # or: npm run start
```

The server binds to `NITRO_HOST:NITRO_PORT` (defaults in `.env.example`). Put it behind a reverse proxy (nginx/Caddy) for TLS, and proxy the WebSocket paths too (the Hocuspocus port and `/api/tldraw-sync`).

## Running under PM2

The repo includes `ecosystem.config.cjs` (fork mode, single instance, 512 MB restart ceiling, logs under `logs/`). Production env (`NODE_ENV=production`, `NITRO_PORT=3033`, `NITRO_HOST=0.0.0.0`) is set in the `env_production` block.

```bash
npm run start:prod      # pm2-runtime ecosystem.config.cjs --env production
npm run pm2:status
npm run pm2:logs
```

> **After upgrading PM2 on the server**, run `pm2 update` so the running daemon matches the new CLI version.

## Docker

```bash
docker compose up --build
```

See `Dockerfile` / `docker-compose.yml`.

## Native modules across architectures

`better-sqlite3` is a native addon. If you build on one architecture (e.g. CI on x64) and run on another (e.g. an arm64 server), rebuild it on the target:

```bash
cd .output/server && npm rebuild better-sqlite3
```

The provided deploy workflow does this automatically.

## CI / CD

`.github/workflows/deploy.yml` runs on push to `master`: install (`npm install --legacy-peer-deps`) → format check → unit tests → integration tests → build → ship the `.output/` archive to the server over SSH and restart PM2. CI runs on **Node 22**.

Secrets needed in the repo's GitHub Actions settings:

- `SSH_HOST` / `SSH_USERNAME` / `SSH_KEY` / `SSH_PORT` — deploy target
- `VITE_TLDRAW_LICENSE_KEY` — tldraw build
- `SENTRY_AUTH_TOKEN` + `NUXT_PUBLIC_SENTRY_DSN` — Sentry (org `lb-0j`, project `aleph-qg`)
- `BACKUP_R2_*` — R2 backups (see [backup.md](backup.md))

## Environment

Set the same variables as in development (see [development.md](development.md#environment-variables)), with production values. At minimum: `BETTER_AUTH_SECRET` (long random string) and `BETTER_AUTH_URL` (your public URL).

## Persistent state

Two directories must persist across deploys — back them up and never wipe them on redeploy:

- `data/` — the SQLite database (`aleph.db`)
- `content/` — the Markdown entity files

The deploy script preserves `data/`, `content/`, `logs/`, and `.env` while replacing code. For off-site durability, configure [R2 backups](backup.md).

## Monitoring

Sentry is wired via `@sentry/nuxt`; set `NUXT_PUBLIC_SENTRY_DSN` (public, safe to expose) at runtime and `SENTRY_AUTH_TOKEN` at build time for source-map upload. With both unset, error tracking is simply disabled.
