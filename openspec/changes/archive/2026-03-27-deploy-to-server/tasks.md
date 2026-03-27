## 1. Health check endpoint

- [x] 1.1 Create `server/api/health.get.ts` — returns `{ status: 'ok', timestamp: new Date().toISOString() }` with no auth required

## 2. Update port to 3033

- [x] 2.1 Update `ecosystem.config.cjs` NITRO_PORT from 3000 to 3033, and `Dockerfile` ENV/EXPOSE from 3000 to 3033, and `docker-compose.yml` port mapping to 3033:3033

## 3. Deployment scripts and configs

- [x] 3.1 Create `deployment/nginx.conf` — reverse proxy for `aleph.ludobermejo.es` on port 3033, HTTPS redirect, WebSocket upgrade support, security headers (HSTS, X-Frame-Options, X-Content-Type-Options), health check location at `/api/health`, Let's Encrypt cert paths
- [x] 3.2 Create `deployment/setup-ssl.sh` — install Certbot, obtain Let's Encrypt cert for `aleph.ludobermejo.es`, copy nginx config to sites-available, enable site, set up auto-renewal crontab
- [x] 3.3 Create `deployment/deploy.sh` — manual server-side deploy script: stop PM2, rsync code (exclude data/content/logs/node_modules/.git), install production deps, create required dirs, check .env exists, restart PM2, save PM2 startup
- [x] 3.4 Create `deployment/README.md` — first-time server setup guide: prerequisites (Node.js 22+, PM2, Nginx, Certbot), directory structure, environment variables, step-by-step setup, troubleshooting

## 4. GitHub Actions workflow

- [x] 4.1 Create `.github/workflows/deploy.yml` — trigger on push to master, with jobs:
  - **test**: checkout, setup Node 22, npm ci, run unit tests
  - **deploy** (needs test): checkout, setup Node 22, npm ci, `npm run build`, create archive of `.output/` + `server/db/migrations/` + `ecosystem.config.cjs` + `package*.json`, SCP archive to server, SSH to deploy (source NVM, backup data/content/logs/.env, extract archive, npm ci --production, restore data if empty, set permissions, pm2 restart or start, cleanup archive, rotate backups keeping last 3)

## 5. GitHub Secrets

- [x] 5.1 Use `gh secret set` to create all required secrets in the repo: `SSH_HOST`, `SSH_USERNAME`, `SSH_KEY`, `SSH_PORT`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` — prompt the user for each value since these are sensitive and cannot be guessed
