## Why

Aleph has a Dockerfile and docker-compose.yml but no automated deployment pipeline. Every deploy is manual. The calendar-sync project already has a battle-tested deployment to a remote Linux server using GitHub Actions, PM2, Nginx, and Let's Encrypt — we should replicate that pattern for Aleph.

## What Changes

- **GitHub Actions workflow** (`.github/workflows/deploy.yml`) — on push to `master`, run tests, build archive, SCP to server, deploy via SSH with zero-downtime PM2 restart
- **Deployment scripts** (`deployment/deploy.sh`) — manual deploy script for server-side use
- **Nginx config** (`deployment/nginx.conf`) — reverse proxy with HTTPS, WebSocket support (Hocuspocus), security headers
- **SSL setup** (`deployment/setup-ssl.sh`) — Let's Encrypt via Certbot with auto-renewal
- **Deployment README** (`deployment/README.md`) — first-time server setup guide
- **GitHub secrets** — all required secrets created in the repo via `gh secret set`
- **Health check endpoint** (`server/api/health.get.ts`) — returns status for Nginx health checks

## Capabilities

### New Capabilities
- `server-deployment`: Automated CI/CD deployment pipeline to a remote Linux server

### Modified Capabilities

## Impact

- `.github/workflows/deploy.yml` (new) — CI/CD pipeline
- `deployment/deploy.sh` (new) — manual deploy script
- `deployment/nginx.conf` (new) — Nginx reverse proxy config
- `deployment/setup-ssl.sh` (new) — SSL certificate setup
- `deployment/README.md` (new) — deployment documentation
- `server/api/health.get.ts` (new) — health check endpoint
- No changes to existing code
