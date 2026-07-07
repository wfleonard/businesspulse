#!/usr/bin/env bash
#
# deploy.sh — first-time deploy of BusinessPulse on the app node.
#
# Prerequisites (see DEPLOY.md):
#   - Docker + compose plugin installed
#   - repo cloned, this script run from the repo root
#   - .env created from .env.production.example and filled in
#   - certs/db-ca.crt present if .env sets DATABASE_CA_CERT_FILE (verify-full)
#   - DNS for businesspulse.app pointed at this node (for Caddy TLS)
#
# Optional first-user seed: export BP_SEED_EMAIL + BP_SEED_PASSWORD (+ BP_SEED_ORG)
# before running, e.g.:
#   BP_SEED_EMAIL=you@ex.com BP_SEED_PASSWORD='...' BP_SEED_ORG='Acme' ./deploy.sh
#
set -euo pipefail
cd "$(dirname "$0")"

COMPOSE="docker compose -f docker-compose.prod.yml"

echo "==> Checking prerequisites"
command -v docker >/dev/null 2>&1 || { echo "ERROR: Docker is not installed (see DEPLOY.md step 1)."; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "ERROR: docker compose plugin missing."; exit 1; }
[ -f .env ] || { echo "ERROR: .env not found. Copy .env.production.example -> .env and fill it in."; exit 1; }
if grep -q 'REPLACE' .env; then
  echo "ERROR: .env still contains REPLACE placeholders — fill them in first."; exit 1
fi
if grep -q '^DATABASE_CA_CERT_FILE=' .env && [ ! -f certs/db-ca.crt ]; then
  echo "ERROR: .env sets DATABASE_CA_CERT_FILE but certs/db-ca.crt is missing."
  echo "       Place the DB CA cert there, or remove the DATABASE_CA_CERT_FILE line."
  exit 1
fi

echo "==> Applying database migrations"
$COMPOSE --profile tools run --rm migrate

if [ -n "${BP_SEED_EMAIL:-}" ] && [ -n "${BP_SEED_PASSWORD:-}" ]; then
  echo "==> Seeding owner user (${BP_SEED_EMAIL})"
  $COMPOSE --profile tools run --rm \
    -e BP_SEED_EMAIL="$BP_SEED_EMAIL" \
    -e BP_SEED_PASSWORD="$BP_SEED_PASSWORD" \
    -e BP_SEED_ORG="${BP_SEED_ORG:-My Business}" \
    migrate npm run seed
else
  echo "==> Skipping seed (set BP_SEED_EMAIL + BP_SEED_PASSWORD to create the first user)"
fi

echo "==> Building and starting the stack (web + valkey + caddy)"
$COMPOSE up -d --build

echo "==> Status"
$COMPOSE ps

cat <<'DONE'

Deploy complete.
  - Watch Caddy obtain the TLS cert:   docker compose -f docker-compose.prod.yml logs -f caddy
  - App: https://businesspulse.app
DONE
