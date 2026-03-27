# Aleph — Server Deployment Guide

## Prerequisites

- **Ubuntu/Debian** server
- **Node.js 22+** (via NVM recommended)
- **PM2** — `npm install -g pm2`
- **Nginx** — `apt install nginx`
- **Certbot** — installed by `setup-ssl.sh`

## Directory Structure

```
/var/www/aleph/
├── .output/           # Nuxt built output (deployed from CI)
├── server/db/migrations/  # DB migrations (auto-run on startup)
├── ecosystem.config.cjs   # PM2 config
├── package.json
├── data/              # SQLite database (persisted)
├── content/           # Campaign markdown files (persisted)
├── logs/              # App + PM2 logs (persisted)
└── .env               # Environment variables (not in git)
```

## Environment Variables

Create `/var/www/aleph/.env`:

```env
NODE_ENV=production
NITRO_PORT=3033
NITRO_HOST=0.0.0.0
BETTER_AUTH_SECRET=<random-secret-string>
BETTER_AUTH_URL=https://aleph.ludobermejo.es
```

Generate a secret: `openssl rand -hex 32`

## First-Time Setup

### 1. Server preparation

```bash
# Install Node.js 22 via NVM (as www-data or deploy user)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22

# Install PM2 globally
npm install -g pm2

# Create app directory
sudo mkdir -p /var/www/aleph
sudo chown www-data:www-data /var/www/aleph
```

### 2. SSL + Nginx

```bash
sudo ./deployment/setup-ssl.sh
```

This installs Certbot, obtains a Let's Encrypt certificate for `aleph.ludobermejo.es`, configures Nginx as a reverse proxy, and sets up auto-renewal.

### 3. First deploy

Either push to `master` (triggers GitHub Actions) or run manually:

```bash
sudo ./deployment/deploy.sh /path/to/built/app
```

### 4. Verify

```bash
pm2 status
curl -s https://aleph.ludobermejo.es/api/health
```

## Automated Deployment

Push to `master` triggers `.github/workflows/deploy.yml`:

1. Runs unit tests
2. Builds the Nuxt app
3. Creates a deployment archive
4. SCPs the archive to the server
5. SSHs in and deploys with PM2

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `SSH_HOST` | Server hostname or IP |
| `SSH_USERNAME` | SSH user |
| `SSH_KEY` | Private SSH key |
| `SSH_PORT` | SSH port (usually 22) |
| `BETTER_AUTH_SECRET` | Auth session secret |
| `BETTER_AUTH_URL` | `https://aleph.ludobermejo.es` |

## Troubleshooting

```bash
# Check PM2 status and logs
pm2 status
pm2 logs aleph

# Check Nginx
sudo nginx -t
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log

# Check SSL certificate
sudo certbot certificates

# Restart everything
pm2 restart aleph
sudo systemctl restart nginx

# Manual rollback (restore last backup)
BACKUP=$(ls -dt /var/www/aleph-backup-* | head -1)
pm2 stop aleph
cp -a "$BACKUP/data" /var/www/aleph/
cp -a "$BACKUP/content" /var/www/aleph/
cp "$BACKUP/.env" /var/www/aleph/
pm2 restart aleph
```
