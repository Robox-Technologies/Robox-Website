#!/usr/bin/env bash
#
# Runs ON THE WEB SERVER. It is not executed from the repo directly — the
# deploy workflow pipes it in over SSH (`ssh ... bash -s -- <args>`), so the
# copy that runs is always the one from the commit being deployed.
#
# Usage: remote-deploy.sh <branch> <deploy-dir> <pm2-name> [recreate-pm2]

set -euo pipefail

BRANCH="${1:?branch is required}"
DEPLOY_DIR="${2:?deploy directory is required}"
PM2_NAME="${3:?pm2 process name is required}"
RECREATE_PM2="${4:-false}"

# Astro builds an @astrojs/node standalone server here (see astro.config.ts).
SERVER_ENTRY='dist/server/entry.mjs'

log() { printf '\n==> %s\n' "$*"; }

# Prints the pm2 status of $1 ("online", "stopped", ...) or "missing".
pm2_status() {
    { pm2 jlist 2>/dev/null || echo '[]'; } | node -e '
        let raw = ""
        process.stdin.on("data", (c) => (raw += c)).on("end", () => {
            let list = []
            try { list = JSON.parse(raw) } catch { /* pm2 printed noise */ }
            const app = list.find((a) => a.name === process.argv[1])
            console.log(app ? app.pm2_env.status : "missing")
        })
    ' "$1"
}

log "Selecting node"
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    # shellcheck disable=SC1091
    . "$NVM_DIR/nvm.sh"
    nvm use default >/dev/null 2>&1 || nvm use node || true
fi
command -v node >/dev/null 2>&1 || {
    echo "node is not on PATH for non-interactive SSH sessions" >&2
    exit 1
}
echo "node $(node -v), npm $(npm -v)"

log "Updating $DEPLOY_DIR to origin/$BRANCH"
cd "$DEPLOY_DIR"
git rev-parse --is-inside-work-tree >/dev/null
git fetch --prune origin
git checkout -f -B "$BRANCH" "origin/$BRANCH"
git reset --hard "origin/$BRANCH"
# Drops stale tracked-then-deleted leftovers. Ignored paths (.env, node_modules,
# dist/, build/, .astro/) are untouched because -x is deliberately not passed.
git clean -fd
git --no-pager log -1 --oneline

log "Installing dependencies"
# --include=dev because the build runs `astro check`, which needs devDependencies
# even when the shell already has NODE_ENV=production.
npm ci --include=dev

log "Building"
export NODE_ENV=production
export NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=4096"
npm run build

[ -f "$SERVER_ENTRY" ] || {
    echo "Build finished but $SERVER_ENTRY is missing" >&2
    exit 1
}

log "Restarting pm2 process '$PM2_NAME'"
if [ "$RECREATE_PM2" = 'true' ]; then
    pm2 delete "$PM2_NAME" >/dev/null 2>&1 || true
fi

if [ "$(pm2_status "$PM2_NAME")" = 'missing' ]; then
    echo "'$PM2_NAME' is not registered with pm2 — starting it"
    # A pre-existing process keeps its own pm2 env, but a fresh one has nothing,
    # so seed it from the deploy directory's .env.
    if [ -f .env ]; then
        set -a
        # shellcheck disable=SC1091
        . ./.env
        set +a
        export PORT="${PORT:-${WEBSITE_PORT:-4321}}"
    fi
    pm2 start "$DEPLOY_DIR/$SERVER_ENTRY" --name "$PM2_NAME" --cwd "$DEPLOY_DIR"
else
    pm2 restart "$PM2_NAME" --update-env
fi
pm2 save

log "Health check"
sleep 5
status="$(pm2_status "$PM2_NAME")"
echo "pm2 status: $status"
if [ "$status" != 'online' ]; then
    pm2 logs "$PM2_NAME" --nostream --lines 60 || true
    echo "'$PM2_NAME' is '$status' after the restart" >&2
    exit 1
fi

log "Deployed $BRANCH to $DEPLOY_DIR"
