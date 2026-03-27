#!/bin/bash
# Aleph — Manual server-side deployment script
# Usage: sudo ./deploy.sh [source_dir]
# Run from the server. Source dir defaults to current directory.
set -euo pipefail

APP_NAME="aleph"
APP_DIR="/var/www/aleph"
SOURCE_DIR="${1:-.}"

if [ "$(id -u)" -ne 0 ]; then
    echo "Error: run as root (sudo ./deploy.sh)"
    exit 1
fi

echo "==> Deploying Aleph from ${SOURCE_DIR} to ${APP_DIR}..."

# Create app directory if needed
mkdir -p "${APP_DIR}"

# Stop PM2 process
echo "==> Stopping PM2 process..."
pm2 stop "${APP_NAME}" 2>/dev/null || true

# Backup data before deploy
BACKUP_DIR="/var/www/aleph-backup-$(date +%Y%m%d-%H%M%S)"
echo "==> Creating backup at ${BACKUP_DIR}..."
mkdir -p "${BACKUP_DIR}"
for dir in data content logs; do
    [ -d "${APP_DIR}/${dir}" ] && cp -a "${APP_DIR}/${dir}" "${BACKUP_DIR}/"
done
[ -f "${APP_DIR}/.env" ] && cp "${APP_DIR}/.env" "${BACKUP_DIR}/"

# Sync code (preserve data directories)
echo "==> Syncing code..."
rsync -a --delete \
    --exclude='node_modules' \
    --exclude='data' \
    --exclude='content' \
    --exclude='logs' \
    --exclude='.git' \
    --exclude='.env' \
    --exclude='*.db' \
    --exclude='*.db-shm' \
    --exclude='*.db-wal' \
    "${SOURCE_DIR}/" "${APP_DIR}/"

# Install production dependencies
echo "==> Installing production dependencies..."
cd "${APP_DIR}"
npm ci --production 2>/dev/null || npm install --production

# Create required directories
echo "==> Ensuring directories exist..."
for dir in data content logs; do
    mkdir -p "${APP_DIR}/${dir}"
done
chown -R www-data:www-data "${APP_DIR}"
chmod 750 "${APP_DIR}/data" "${APP_DIR}/content" "${APP_DIR}/logs"

# Check .env
if [ ! -f "${APP_DIR}/.env" ]; then
    echo "WARNING: No .env file found at ${APP_DIR}/.env"
    echo "Create one with BETTER_AUTH_SECRET and BETTER_AUTH_URL before starting."
fi

# Start/restart PM2
echo "==> Starting PM2..."
if pm2 describe "${APP_NAME}" &>/dev/null; then
    pm2 restart "${APP_NAME}"
else
    pm2 start ecosystem.config.cjs --env production
fi
pm2 save

# Set up PM2 startup on boot
pm2 startup systemd -u www-data --hp /var/www 2>/dev/null || true

# Rotate backups (keep last 3)
echo "==> Rotating backups..."
ls -dt /var/www/aleph-backup-* 2>/dev/null | tail -n +4 | xargs rm -rf 2>/dev/null || true

echo ""
echo "Deploy complete! Check status: pm2 status"
