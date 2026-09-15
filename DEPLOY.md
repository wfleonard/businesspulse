# Deploying BusinessPulse to the Linode app node

Stack on the node: **Caddy (auto-HTTPS) + web (Next.js) + worker (AEO snapshots:
Node + the PHP Visibility Panel) + Valkey**, in Docker Compose.
**Postgres is the managed Linode Database** (not on the node).

## 0. Prerequisites

- **DNS:** point `businesspulse.app` (A → node IPv4, AAAA → node IPv6) and
  `www` at the node. Caddy needs this resolving before it can get a TLS cert.
- **DB Access Controls:** allowlist the node's **IPv4 `69.164.219.143/32`**
  (and keep the IPv6). Docker containers egress over IPv4 by default, so the
  IPv4 entry is required or connections are rejected.

## 1. Prep the node (Ubuntu)

```bash
ssh root@69.164.219.143

# Docker + compose plugin
curl -fsSL https://get.docker.com | sh

# Firewall: allow SSH + HTTP(S) only
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw --force enable
# (Or use a Linode Cloud Firewall with the same rules.)

# Harden SSH: key-only auth (after confirming your key works)
#   in /etc/ssh/sshd_config -> PasswordAuthentication no ; then: systemctl reload ssh
```

## 2. Get the code

```bash
git clone https://github.com/wfleonard/businesspulse.git
cd businesspulse
```

## 3. Create the app database + least-privilege role

Run from the node (its IP is allowlisted). Uses the postgres image's psql:

```bash
docker run --rm -it postgres:17-alpine \
  psql "host=a492716-akamai-prod-1220048-default.g2a.akamaidb.net port=23200 user=akmadmin dbname=defaultdb sslmode=require"
```
```sql
CREATE ROLE bp_app WITH LOGIN PASSWORD 'a-strong-app-password';
CREATE DATABASE businesspulse OWNER bp_app;
\q
```

## 3b. Place the DB CA certificate (cert-pinned TLS)

Download the **CA certificate** from the Managed Database page, then on the node:
```bash
mkdir -p certs
# copy the file to certs/db-ca.crt (scp from your machine, or paste with nano)
```
Compose mounts `./certs` read-only into the containers; the app reads it via
`DATABASE_CA_CERT_FILE=/app/certs/db-ca.crt` and connects **verify-full**
(encrypted + certificate-pinned). Keep `DATABASE_URL` on the **hostname** (not IP)
so the cert's name matches.

## 4. Configure env

```bash
cp .env.production.example .env
# Generate secrets:
openssl rand -base64 48   # BETTER_AUTH_SECRET
openssl rand -base64 32   # CONNECTOR_ENC_KEY
openssl rand -base64 24   # VALKEY_PASSWORD
openssl rand -hex 24      # CRON_SECRET
nano .env                 # fill everything in, incl. the bp_app DATABASE_URL
```

`DATABASE_URL` for the app (hostname + `sslmode=no-verify`; the app upgrades to
verify-full via the CA cert from step 3b):
```
postgres://bp_app:<app-password>@a492716-akamai-prod-1220048-default.g2a.akamaidb.net:23200/businesspulse?sslmode=no-verify
```

## 5. Migrate + seed (from the node, in Docker)

```bash
docker compose -f docker-compose.prod.yml --profile tools run --rm migrate

docker compose -f docker-compose.prod.yml --profile tools run --rm \
  -e BP_SEED_EMAIL=wfleonard@saxonenterprises.net \
  -e BP_SEED_PASSWORD='a-strong-passphrase' \
  -e BP_SEED_ORG='Saxon Enterprises' \
  migrate npm run seed
```

Load the canned AEO question panels (safe to re-run; only changed panels get a new version):
```bash
docker compose -f docker-compose.prod.yml --profile tools run --rm migrate npm run aeo:panels
```

## 6. Launch

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f caddy   # watch it get the cert
```
Visit **https://businesspulse.app** and log in.

## 7. No host cron

The analytics product's `/api/cron/sync` and `/api/cron/watch` routes were removed
for the AEO build (the analytics code is tagged `analytics-saas-v0`). If the node's
crontab still calls them, delete those two lines with `crontab -e`: they now just
return 404. The AEO worker needs no cron; it polls Postgres itself.

## Updating

From `~/businesspulse` on the node, after pushing to `main`:

```bash
./update.sh
```

It pulls, rebuilds the migrate image and applies new migrations, then rebuilds and
restarts every service, including the worker. The worker image runs the PHP
panel's test suites while building, so a PHP incompatibility fails the build rather
than the first real snapshot.

If `src/lib/aeo/panels/` changed, reload the panels afterwards:

```bash
docker compose -f docker-compose.prod.yml --profile tools run --rm migrate npm run aeo:panels
```

Worker logs are one JSON line per event:

```bash
docker compose -f docker-compose.prod.yml logs -f worker
```

## AEO launch checklist

Do these in order; the form spends money once it's open.

1. **Rotate secrets first.** Rotate the `akmadmin` DB password in the Linode console,
   and use freshly rotated Perplexity and Anthropic API keys in `.env`.
2. **Fill in the new `.env` values** (see `.env.production.example`):
   `PERPLEXITY_API_KEY`, `ANTHROPIC_API_KEY`, the `AEO_*` settings (start with
   `AEO_DAILY_SPEND_CAP_USD=10`), `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`
   (a Turnstile widget for `businesspulse.app` in the Cloudflare dashboard),
   `AEO_CONTACT_EMAIL`, `AEO_ADMIN_EMAIL`, `AEO_BOOKING_URL`, and
   `MAILTRAP_API_TOKEN` / `MAILTRAP_SENDER` on a sending domain verified in Mailtrap.
3. **Merge `aeo` into `main`** and push.
4. **Deploy:** `./update.sh`, then load the panels (command above).
5. **Check the stack:** `docker compose -f docker-compose.prod.yml ps` shows `worker`
   running, and its logs show `worker_started`.
6. **Live check with a small snapshot:** temporarily set `AEO_SNAPSHOT_QUESTIONS=5`,
   restart the worker (`docker compose -f docker-compose.prod.yml up -d worker`),
   submit one request through the public form, and confirm the verification email,
   the report page, the "report ready" email, and the lead in `/dashboard/aeo`.
   Then set it back to 20 and restart the worker again.
7. **Remove the old cron lines** (section 7).

## Post-launch hardening

- **Rotate the `akmadmin` DB password** (it was shared in chat) in the Linode console,
  before opening the AEO form (launch checklist, step 1).
- TLS is already cert-pinned (verify-full) via `DATABASE_CA_CERT_FILE` + step 3b.
- Move Redis to Upstash when you add a second app node behind a NodeBalancer.
