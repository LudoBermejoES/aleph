## Context

Aleph is a full-stack Nuxt 4 app (SSR disabled, SPA mode) with SQLite, better-auth sessions, and Hocuspocus WebSocket collaboration. It already has a multi-stage Dockerfile and PM2 ecosystem config. The calendar-sync project deploys to the same server (`*.ludobermejo.es`) and we're replicating that proven pattern.

Key differences from calendar-sync:
- Aleph is a Nuxt build (`.output/` directory) vs raw Node.js
- Aleph has persistent data in 3 directories: `data/` (SQLite), `content/` (markdown files), `logs/`
- Aleph uses WebSockets (Hocuspocus) — Nginx needs WebSocket upgrade support
- Aleph runs on port 3033 (not 3008)
- Aleph has DB migrations that run automatically on startup via `server/plugins/migrations.ts`

## Goals / Non-Goals

**Goals:**
- Push to `master` → tests pass → auto-deploy to production server
- Zero-downtime deploys via PM2 restart (not full stop/start)
- Preserve data/content/logs across deploys
- All secrets managed via GitHub Secrets (created with `gh secret set`)
- HTTPS with auto-renewing Let's Encrypt certificates
- WebSocket proxy for Hocuspocus real-time collaboration

**Non-Goals:**
- Docker-based deployment on the server (we use PM2 directly, like calendar-sync)
- Multi-server / load balancer setup
- Blue-green deployment
- Automated rollbacks (manual backup restore is sufficient)

## Decisions

**Domain: `aleph.ludobermejo.es`** — follows the `*.ludobermejo.es` pattern from calendar-sync.

**Server path: `/var/www/aleph/`** — standard www path, consistent with calendar-sync's `/var/www/google-sync/`.

**Port: 3033** — matches the existing Dockerfile and ecosystem config.

**No Docker on server** — deploy the built `.output/` directly with PM2, same as calendar-sync. Simpler, fewer moving parts, easier to debug.

**Build on CI, not on server** — GitHub Actions builds the Nuxt app (`npm run build`), archives `.output/` + migrations + ecosystem config, ships the archive. Server just installs production deps and restarts PM2.

**Backup before deploy** — copy `data/`, `content/`, `logs/`, and `.env` to a timestamped backup dir. Keep last 3 backups.

**GitHub Secrets needed:**
| Secret | Purpose |
|--------|---------|
| `SSH_HOST` | Server hostname/IP |
| `SSH_USERNAME` | SSH user (e.g. `www-data` or deploy user) |
| `SSH_KEY` | Private SSH key for authentication |
| `SSH_PORT` | SSH port (default 22) |
| `BETTER_AUTH_SECRET` | better-auth session secret |
| `BETTER_AUTH_URL` | Public URL (`https://aleph.ludobermejo.es`) |

**Health check endpoint** — simple `GET /api/health` returning `{ status: 'ok', timestamp }`. Used by Nginx for `proxy_pass` health verification and by monitoring.

**Nginx WebSocket support** — Hocuspocus needs `Upgrade` and `Connection` headers proxied. Calendar-sync already does this for webhooks; we need it for all requests since Hocuspocus can upgrade any connection at `/api/collaboration`.

**PM2 ecosystem** — reuse the existing `ecosystem.config.cjs` as-is. It already has the right script path, memory limits, and log config.

## Risks / Trade-offs

[Risk] First deploy needs manual server setup (Node.js, PM2, Nginx, SSL) → Mitigation: `deployment/README.md` + `setup-ssl.sh` document everything step by step.

[Risk] SQLite WAL file corruption if PM2 kill is too aggressive → Mitigation: PM2 `kill_timeout` of 5 seconds gives better-sqlite3 time to flush. SQLite WAL mode handles this gracefully.

[Risk] `content/` directory can grow large over time → Mitigation: rsync exclude on deploy only applies to code, not data dirs. Content dir is never touched during deploy.

[Risk] NVM path may differ on server → Mitigation: Deploy script sources NVM explicitly (same approach as calendar-sync).

## Migration Plan

1. Create all deployment files
2. Set GitHub secrets via `gh secret set`
3. First-time server setup: install Node.js, PM2, Nginx (documented in README)
4. Run `setup-ssl.sh` for certificates
5. Push to master — workflow triggers automatic deploy
6. Verify via `https://aleph.ludobermejo.es`
