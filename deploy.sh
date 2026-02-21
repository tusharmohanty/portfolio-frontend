#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/Users/tusharmohanty/projects/stock-portfolio-app"
DIST_DIR="$APP_DIR/dist/stock-portfolio-app/browser"
NGINX_ROOT="/opt/homebrew/var/www/portfolio"
SITE_URL="http://dev.local"

echo "==> Deploy (clean) starting..."
echo "APP_DIR:    $APP_DIR"
echo "DIST_DIR:   $DIST_DIR"
echo "NGINX_ROOT: $NGINX_ROOT"
echo

cd "$APP_DIR"

echo "==> Clean Angular outputs + caches..."
rm -rf dist .angular

echo "==> Clean node_modules (full clean)..."
rm -rf node_modules

echo "==> Install dependencies (npm ci)..."
npm ci

echo "==> Build Angular (production)..."
npm run build -- --configuration production

if [[ ! -f "$DIST_DIR/index.html" ]]; then
  echo "ERROR: Missing $DIST_DIR/index.html"
  echo "Build output not found. Check Angular output path."
  exit 1
fi

echo "==> Deploy to nginx docroot..."
sudo mkdir -p "$NGINX_ROOT"
sudo rm -rf "${NGINX_ROOT:?}/"*
sudo cp -R "$DIST_DIR/"* "$NGINX_ROOT/"
sudo chmod -R 755 "$NGINX_ROOT"

echo "==> Validate + reload nginx..."
nginx -t
sudo nginx -s reload

echo "==> Smoke tests..."
echo -n "UI:  "
curl -s -o /dev/null -w "%{http_code}\n" "$SITE_URL/"

echo -n "API: "
curl -s -o /dev/null -w "%{http_code}\n" "$SITE_URL/api/holdings"

echo "==> Done. Open: $SITE_URL/"
