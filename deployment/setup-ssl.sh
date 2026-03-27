#!/bin/bash
# Aleph — SSL certificate setup (run once on the server as root)
set -euo pipefail

DOMAIN="aleph.ludobermejo.es"
EMAIL="ludobermejo@gmail.com"
NGINX_CONF="aleph"

echo "==> Installing Certbot..."
if command -v apt-get &>/dev/null; then
    apt-get update && apt-get install -y certbot python3-certbot-nginx
elif command -v yum &>/dev/null; then
    yum install -y certbot python3-certbot-nginx
else
    echo "Unsupported package manager. Install certbot manually."
    exit 1
fi

echo "==> Stopping Nginx temporarily..."
systemctl stop nginx || true

echo "==> Obtaining certificate for ${DOMAIN}..."
certbot certonly --standalone \
    --non-interactive \
    --agree-tos \
    --email "${EMAIL}" \
    -d "${DOMAIN}"

echo "==> Installing Nginx config..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cp "${SCRIPT_DIR}/nginx.conf" "/etc/nginx/sites-available/${NGINX_CONF}"
ln -sf "/etc/nginx/sites-available/${NGINX_CONF}" "/etc/nginx/sites-enabled/${NGINX_CONF}"

echo "==> Testing and starting Nginx..."
nginx -t
systemctl start nginx

echo "==> Setting up auto-renewal..."
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet --deploy-hook 'systemctl reload nginx'") | sort -u | crontab -

echo "==> Certificate status:"
certbot certificates

echo ""
echo "Done! HTTPS is live at https://${DOMAIN}"
