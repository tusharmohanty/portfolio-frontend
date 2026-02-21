#!/usr/bin/env bash
set -euo pipefail

# =========================
# Frontend deploy (Angular) -> castle (brew nginx)
# =========================

CASTLE_HOST="castle.local"
CASTLE_USER="tushar"
CASTLE_SSH="${CASTLE_USER}@${CASTLE_HOST}"

ROOT_DIR="/Users/tusharmohanty/projects/stock-portfolio-app"

# If your angular.json is in ROOT_DIR, build from there.
FRONTEND_DIR="$ROOT_DIR"

# Choose ONE:
# 1) If you build from root:
FRONTEND_BUILD_CMD="npm run build"
# 2) If you need production config:
# FRONTEND_BUILD_CMD="npm run build -- --configuration production"

# Angular output from your log:
FRONTEND_DIST_DIR="$ROOT_DIR/dist/stock-portfolio-app"

# Remote target (nginx root points to /var/www/portfolio-frontend/browser in your setup)
REMOTE_FRONTEND_DIR="/var/www/portfolio-frontend"

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
if [[ -f package-lock.json ]]; then npm ci; else npm install; fi
$FRONTEND_BUILD_CMD
popd >/dev/null

if [[ ! -d "$FRONTEND_DIST_DIR" ]]; then
  echo "Build output not found: $FRONTEND_DIST_DIR"
  echo "Update FRONTEND_DIST_DIR to match your Angular output."
  exit 1
fi

# If Angular produced /browser, deploy that folder contents to remote /browser
SYNC_SRC="$FRONTEND_DIST_DIR"
SYNC_DEST="$REMOTE_FRONTEND_DIR"

if [[ -d "$FRONTEND_DIST_DIR/browser" ]]; then
  SYNC_SRC="$FRONTEND_DIST_DIR/browser"
  SYNC_DEST="$REMOTE_FRONTEND_DIR/browser"
fi

log "Sync source: $SYNC_SRC"
log "Sync dest  : $SYNC_DEST"

# ---- Remote dir ----
log "Preparing remote directory"
ssh -t "$CASTLE_SSH" "sudo mkdir -p '$SYNC_DEST' && sudo chown -R '$CASTLE_USER':\$(id -gn '$CASTLE_USER') '$REMOTE_FRONTEND_DIR'"

# ---- Deploy ----
log "Deploying files (rsync --delete)"
rsync -av --delete --progress "$SYNC_SRC"/ "$CASTLE_SSH:$SYNC_DEST/"

log "Done ✅"
log "Try: http://${CASTLE_HOST}/holdings"
