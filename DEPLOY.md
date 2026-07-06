# Deploying BusinessPulse to the Linode app node

Stack on the node: **Caddy (auto-HTTPS) + web (Next.js) + Valkey**, in Docker Compose.
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

`DATABASE_URL` for the app:
```
postgres://bp_app:<app-password>@a492716-akamai-prod-1220048-default.g2a.akamaidb.net:23200/businesspulse?sslmode=require
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

## 6. Launch

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f caddy   # watch it get the cert
```
Visit **https://businesspulse.app** and log in.

## 7. Schedule sync + Business Watch (host cron)

The cron routes are guarded by `CRON_SECRET`; call them through Caddy:

```bash
crontab -e
```
```cron
CRON=<your CRON_SECRET>
*/30 * * * * curl -fsS -X POST https://businesspulse.app/api/cron/sync  -H "Authorization: Bearer $CRON" >/dev/null
0 7   * * *  curl -fsS -X POST https://businesspulse.app/api/cron/watch -H "Authorization: Bearer $CRON" >/dev/null
```

## Updating

```bash
git pull
docker compose -f docker-compose.prod.yml --profile tools run --rm migrate   # if schema changed
docker compose -f docker-compose.prod.yml up -d --build
```

## Post-launch hardening

- **Rotate the `akmadmin` DB password** (it was shared in chat) in the Linode console.
- Switch `DATABASE_URL` to `sslmode=verify-full` with the downloaded CA cert once
  real customer data is flowing (encrypted + cert-pinned).
- Move Redis to Upstash when you add a second app node behind a NodeBalancer.
