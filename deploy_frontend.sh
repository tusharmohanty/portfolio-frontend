#!/usr/bin/env bash
set -euo pipefail

# =========================
# Frontend deploy (Angular) -> castle (Ubuntu nginx)
# =========================

CASTLE_HOST="castle"
CASTLE_USER="tushar"
CASTLE_SSH="${CASTLE_USER}@${CASTLE_HOST}"

ROOT_DIR="/Users/tusharmohanty/projects/stock-portfolio-app"
FRONTEND_DIR="$ROOT_DIR"

# Build command
FRONTEND_BUILD_CMD="npm run build"
# Example if you later want prod config:
# FRONTEND_BUILD_CMD="npm run build -- --configuration production"

# Angular output root
FRONTEND_DIST_DIR="$ROOT_DIR/dist/stock-portfolio-app"

# Nginx serves from /var/www/portfolio-frontend/browser
REMOTE_FRONTEND_ROOT="/var/www/portfolio-frontend"
REMOTE_BROWSER_DIR="${REMOTE_FRONTEND_ROOT}/browser"

log() { printf "\n\033[1;36m==>\033[0m %s\n" "$*"; }

# ---- Preflight ----
command -v ssh >/dev/null || { echo "ssh missing"; exit 1; }
command -v rsync >/dev/null || { echo "rsync missing"; exit 1; }
command -v npm >/dev/null || { echo "npm missing"; exit 1; }

log "Preflight: SSH to ${CASTLE_SSH}"
ssh -o BatchMode=yes -o ConnectTimeout=5 "$CASTLE_SSH" "echo 'SSH OK on $(hostname)'" >/dev/null

# ---- Build ----
log "Building frontend in $FRONTEND_DIR"
pushd "$FRONTEND_DIR" >/dev/null
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi
$FRONTEND_BUILD_CMD
popd >/dev/null

if [[ ! -d "$FRONTEND_DIST_DIR" ]]; then
  echo "Build output not found: $FRONTEND_DIST_DIR"
  echo "Update FRONTEND_DIST_DIR to match your Angular output."
  exit 1
fi

# Angular 17+/SSR-style output often uses dist/.../browser
SYNC_SRC="$FRONTEND_DIST_DIR"
if [[ -d "$FRONTEND_DIST_DIR/browser" ]]; then
  SYNC_SRC="$FRONTEND_DIST_DIR/browser"
fi

log "Sync source: $SYNC_SRC"
log "Sync dest  : $REMOTE_BROWSER_DIR"

# ---- Remote prepare ----
log "Preparing remote directory"
ssh "$CASTLE_SSH" "
  set -e
  sudo mkdir -p '$REMOTE_BROWSER_DIR'
"

# ---- Deploy ----
# Use --rsync-path='sudo rsync' so writes to /var/www work cleanly
log "Deploying files (rsync --delete)"
rsync -av --delete --progress \
  --rsync-path="sudo rsync" \
  "$SYNC_SRC"/ "$CASTLE_SSH:$REMOTE_BROWSER_DIR/"

# ---- Permissions ----
log "Fixing ownership and permissions"
ssh "$CASTLE_SSH" "
  set -e
  sudo chown -R www-data:www-data '$REMOTE_FRONTEND_ROOT'
  sudo find '$REMOTE_FRONTEND_ROOT' -type d -exec chmod 755 {} \;
  sudo find '$REMOTE_FRONTEND_ROOT' -type f -exec chmod 644 {} \;
"

# ---- Reload nginx ----
log "Reloading nginx"
ssh "$CASTLE_SSH" "
  set -e
  sudo -n nginx -t
  sudo -n systemctl reload nginx
"

# ---- Verify ----
log "Verifying deployment"
curl -sSf https://castle.local >/dev/null

log "Done ✅"
log "Try: https://castle.local/holdings"