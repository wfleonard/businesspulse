# BusinessPulse

Dashboards, alerts, and AI insights for everyday business decisions — a
business-monitoring SaaS for small/mid-sized businesses.

> Connect your business data. Ask questions. Get alerts. Understand what
> changed. Know what to do next.

See the product strategy in [`docs/analytics_saas_strategy.md`](docs/analytics_saas_strategy.md).

## Stack

- **Next.js 16** (App Router, Turbopack), **React 19**, **TypeScript**, **Tailwind 4**
- **Postgres** via **Drizzle ORM** (managed: Linode Managed DB or Neon)
- **better-auth** — email+password, Argon2id hashing, secure session cookies
- **Redis/Valkey** (TCP) — BullMQ queue + cache + rate-limit
- **Anthropic Claude** for the Ask / Insights layers (Stage 3+)
- **Mailtrap** for transactional/alert email (Stage 4)

Hosting target: **Linode + Docker Compose**, app box kept stateless, with
managed Postgres and Redis off-box (scales horizontally behind a NodeBalancer).

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL, REDIS_URL, secrets

# Generate secrets:
#   openssl rand -base64 48   # BETTER_AUTH_SECRET
#   openssl rand -base64 32   # CONNECTOR_ENC_KEY

# Apply the schema to your Postgres:
npm run db:push               # or: npm run db:migrate (uses drizzle/ migrations)

# Provision the first user + organization (single-user MVP):
BP_SEED_EMAIL=you@example.com BP_SEED_PASSWORD='a-strong-passphrase' \
  BP_SEED_ORG='My Business' npm run seed

npm run dev                   # http://localhost:3000
```

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Next.js dev / production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Jest unit tests |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generate a SQL migration from the Drizzle schema |
| `npm run db:migrate` / `db:push` | Apply migrations / push schema to the DB |
| `npm run seed` | Provision the first user + org |
| `npm run sample` | Load sample metrics (dev) |
| `npm run dev:add-source` | Register an API source pointing at the built-in mock endpoint (dev) |

## Project layout

```
src/
  app/                 routes (/, /login, /dashboard, /api/auth/[...all])
  components/          ui primitives + auth controls
  lib/
    auth.ts            better-auth server (Argon2id, secure cookies)
    auth-client.ts     better-auth React client
    session.ts         getSession / requireSession server guards
    db/                Drizzle client (lazy pool) + schema
    crypto.ts          AES-256-GCM for connector secrets at rest
    rate-limit.ts      Redis fixed-window limiter
    redis.ts           lazy ioredis client
    audit.ts           audit-log helper
  proxy.ts             security headers (HSTS/CSP/…) + optimistic auth gate
drizzle/               generated SQL migrations
scripts/seed.ts        first-user provisioning
```

## Security baseline (Stage 0)

- Argon2id password hashing; httpOnly + `Secure` (prod) + SameSite=Lax session cookies.
- Security headers via `src/proxy.ts`: HSTS (prod), nonce-based CSP (prod) /
  relaxed CSP (dev), `X-Frame-Options: DENY`, `nosniff`, referrer + permissions policy.
- Connector credentials encrypted at rest (AES-256-GCM, `CONNECTOR_ENC_KEY`).
- Every business-data table carries `org_id` for tenant isolation (RLS at the
  multi-tenant stage).
- The AI layer will see only pre-computed summaries — never raw rows or the DB.

## Build stages

- **Stage 0 (done):** scaffold + security baseline + schema + auth + protected shell.
- **Stage 1 (done):** metrics core — manual entry + CSV import, Business Pulse KPI
  dashboard, metric detail with Recharts.
- **Stage 2 (done):** per-customer API connector — Zod-validated config (encrypted
  at rest), field-mapping normalize engine, windowed idempotent sync, `Sync now` +
  a `CRON_SECRET`-guarded `/api/cron/sync` trigger, Data Sources UI, dev mock endpoint.
- **Stages 3–6:** Ask layer → Business Watch + digest → Actions → SaaS-ization.

### Connector config (Stage 2)

An API source is configured with JSON like:

```jsonc
{
  "baseUrl": "https://api.example.com",
  "auth": { "type": "bearer", "token": "…" },   // none | apiKey | bearer | basic
  "endpoints": [
    {
      "path": "/v1/metrics",
      "rowsPath": "data",                          // path to the array of rows
      "mappings": [
        { "metricKey": "website_leads", "valuePath": "leads",
          "periodStartPath": "month_start", "periodEndPath": "month_end" }
      ]
    }
  ]
}
```

Secrets in the config are encrypted at rest (AES-256-GCM). Sync replaces this
source's rows within the fetched period window (idempotent) and never touches
manual/other-source data. New metric keys get an auto-created definition.
