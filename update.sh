#!/usr/bin/env bash
#
# update.sh — pull the latest code and redeploy BusinessPulse.
# Run from the repo root on the app node after changes are pushed to main.
#
set -euo pipefail
cd "$(dirname "$0")"

COMPOSE="docker compose -f docker-compose.prod.yml"

[ -f .env ] || { echo "ERROR: .env not found — run deploy.sh first."; exit 1; }

echo "==> Pulling latest code"
git pull --ff-only

echo "==> Applying any new database migrations"
# Rebuild the migrate image first — it's profile-gated, so `up --build` skips it,
# and a stale image ships old migration files (silently applies nothing).
$COMPOSE build migrate
$COMPOSE --profile tools run --rm migrate

echo "==> Rebuilding and restarting the stack"
$COMPOSE up -d --build

echo "==> Pruning dangling images"
docker image prune -f >/dev/null 2>&1 || true

echo "==> Status"
$COMPOSE ps

echo ""
echo "Update complete. Recent web logs:"
$COMPOSE logs --tail=20 web
