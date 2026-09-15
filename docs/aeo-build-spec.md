# BusinessPulse AEO — v1 Build Spec

**Owner:** Bill Leonard, Saxon Enterprises
**Date:** September 15, 2026
**Status:** Draft for build
**Business context:** `/Users/saxon/SaxonAEO/saxon-aeo-business-plan.md`, Section 7

---

## 1. Goal

A visitor enters their business, confirms their email, and receives a free AI search
visibility snapshot: how often AI assistants cite them, and who gets cited instead.
Every submission becomes a lead in an admin view that only Bill sees.

BusinessPulse is the free front door; Saxon AEO sells the service. Every report says so.

### In scope for v1

- Public landing page with a submission form
- Email verification before any API spend
- Background worker that runs a ~20-question Perplexity snapshot
- Public, unlisted report page and "report ready" email
- Canned panel for HDD / trenchless, with a generated-panel fallback for everything else
- Admin lead list and run detail behind the existing login
- Abuse and spend controls

### Out of scope for v1

- Payments and the paid full-audit tier
- Self-serve multi-engine runs (Claude, ChatGPT)
- Monthly monitoring
- Customer accounts — free users never get a login

---

## 2. Where the Code Goes

**Repository:** `/Users/saxon/businesspulse` (the app already live at businesspulse.app)

**Branching:**

1. Tag current `main` as `analytics-saas-v0`. That preserves the analytics product exactly.
2. Build on a new `aeo` branch.
3. Merge to `main` and deploy only when Milestone 6 passes.

The live analytics app keeps running from `main` until then.

**Layout on the `aeo` branch:**

```
src/app/page.tsx                       landing page + form (replaces analytics landing)
src/app/api/aeo/requests/route.ts      POST: submit form
src/app/check/verify/route.ts          GET: email verification link
src/app/report/[publicId]/page.tsx     public snapshot report
src/app/privacy/page.tsx               privacy policy
src/app/dashboard/aeo/page.tsx         admin: lead list
src/app/dashboard/aeo/[runId]/page.tsx admin: run detail
src/lib/aeo/                           domain logic (see Section 6)
src/worker/index.ts                    worker entry point
panel/                                 PHP Visibility Panel engine (Section 5.2)
drizzle/                               new migration for aeo_* tables
docs/aeo-build-spec.md                 this file
```

**Parking the analytics product on `aeo`:** remove the analytics nav items, the analytics
dashboard pages, and the `/api/cron/sync` and `/api/cron/watch` routes. Leave `src/lib`
analytics modules and their database tables untouched in v1 to avoid migration churn;
delete them in a later cleanup.

**SaxonAEO keeps client work only** — business plan, client deliverables, client profiles,
and local audit data (ECU, iCA). `panel/` here is the only copy of the engine;
`SaxonAEO/visibility-panel/panel` is a wrapper that runs it against SaxonAEO's own data
(decided 2026-09-15, Section 16).

---

## 3. Architecture

```
Browser ── POST /api/aeo/requests ──► web (Next.js)
                                        │  Turnstile + rate limits
                                        ▼
                                  Postgres: aeo_request (pending)
                                        │
                     verification email │  (Mailtrap)
                                        ▼
Browser ── GET /check/verify ────────► web: marks verified, creates aeo_run (queued)
                                        │
                                        ▼
                     worker (Node) ── claims run from Postgres (SKIP LOCKED)
                        │  resolves panel → fills slots → samples 20 questions
                        │  writes job JSON
                        ▼
                     php panel/panel.php job   ── Perplexity API
                        │  writes result JSON
                        ▼
                     worker: stores aeo_result rows, totals, cost
                        │
                        ├─► "report ready" email with /report/{publicId}
                        └─► lead appears in /dashboard/aeo
```

### Deployment shape

Same Linode server, same Docker Compose file. **One new service: `worker`.** No new server.

---

## 4. Key Decisions

### 4.1 Postgres is the job queue, not Valkey

`docker-compose.prod.yml` runs Valkey with `--save '' --appendonly no` — no persistence.
A Redis-backed queue would silently lose every queued job on a restart or deploy.

Runs live in `aeo_run` and the worker claims them with `FOR UPDATE SKIP LOCKED` (full
query in `src/lib/aeo/queue.ts`):

```sql
UPDATE aeo_run
SET status = 'running', attempts = attempts + 1,
    locked_at = now(), lease_token = gen_random_uuid()
WHERE id = (
  SELECT id FROM aeo_run
  WHERE attempts < 3
    AND ((status = 'queued' AND <past its retry delay>)
      OR (status = 'running' AND locked_at < now() - <lease>))
  ORDER BY created_at
  FOR UPDATE SKIP LOCKED
  LIMIT 1
)
RETURNING *;
```

**A heartbeat lease, not a fixed timeout.** While the panel runs, the worker refreshes
`locked_at` five times per lease (`AEO_LEASE_SECONDS`, default 300). A crashed worker's
run is reclaimed once the lease lapses — a fixed 15-minute cutoff would both delay
recovery and steal a long full-tier run that was still healthy. Every write back to a run
requires its `lease_token`, so a worker that lost its lease can't overwrite the one that
took over; its heartbeat notices and it stops the panel.

A failed attempt returns to `queued` after `attempts × AEO_RETRY_DELAY_SECONDS`. The
third failure, or a permanent error (unknown panel, invalid job file), marks it `failed`,
as does a worker dying on the final attempt. Results and totals are stored in one
transaction that first deletes earlier rows, so a retried run never holds duplicates;
cost accumulates across attempts because it was really spent. A graceful shutdown
(deploy) releases the run and refunds the attempt. Valkey stays for rate limiting only.

### 4.2 Worker runs the existing PHP panel

The panel is live-verified against all three assistants and has a regression suite. v1
calls it rather than porting it. The Node worker owns the database, email, and question
generation; PHP owns only the engine calls and verdict analysis.

### 4.3 No accounts for free users

Verification is a signed, single-use email link — not better-auth signup.
`BP_ALLOW_SIGNUP` stays `false`. The only login is the admin.

### 4.4 AEO tables are not org-scoped

The existing schema convention is "every business-data table carries `org_id`." AEO
requests are pre-account public submissions with no org, so these tables deliberately
omit it. They are Saxon's operational data, visible only to the admin.

---

## 5. Worker

### 5.1 Container

New Dockerfile stage `worker`, based on the existing `build` stage (it already has
dependencies, source, and `tsx`), adding PHP:

```dockerfile
FROM build AS worker
RUN apt-get update \
 && apt-get install -y --no-install-recommends php-cli php-curl php-mbstring \
 && rm -rf /var/lib/apt/lists/*
RUN php panel/tests/smoke.php          # build fails if the panel is broken on this PHP
CMD ["npx", "tsx", "src/worker/index.ts"]
```

Debian's `php-cli` is 8.2; the panel was developed on 8.5. The smoke-test step is the
compatibility gate — fix any 8.2 incompatibilities it surfaces before proceeding.

Compose service:

```yaml
worker:
  build: { context: ., target: worker }
  restart: unless-stopped
  env_file: .env
  volumes:
    - ./certs:/app/certs:ro
```

No ports, no Valkey dependency.

### 5.2 Panel `job` command

Add a `job` command to `panel/panel.php`. It reads a job file, runs it, writes a result
file, and touches no SQLite.

```bash
php panel/panel.php job --in=/tmp/aeo/{runId}.job.json --out=/tmp/aeo/{runId}.result.json
```

**Job file:**

```json
{
  "client": {
    "name": "East Coast Utility, LLC",
    "domain": "eastcoastutility.com",
    "aliases": ["East Coast Utility"],
    "directory_domains": ["yelp.com", "bbb.org"],
    "reference_domains": ["law.cornell.edu", "ditchwitch.com"]
  },
  "questions": [
    { "c": "cost", "q": "How much does horizontal directional drilling cost per foot in New Jersey?" }
  ],
  "engines": ["perplexity"],
  "concurrency": 4
}
```

**Result file:** one entry per question × engine with `query`, `category`, `engine`,
`model`, `own_cited`, `name_mentioned`, `directory_only`, `own_rank`, `rivals`,
`sources`, `answer`, `input_tokens`, `output_tokens`, `searches`, `cost_usd`, `error`;
plus run totals.

API keys come from the environment, as they do today. Exit non-zero only on a fatal
error; per-question failures are recorded in the result, not thrown.

The worker kills the PHP process after 10 minutes and marks the attempt failed.

### 5.3 Worker loop

1. Poll Postgres every `AEO_WORKER_POLL_MS` (default 3000) using the claim query.
2. **Spend check:** if today's `sum(cost_usd)` ≥ `AEO_DAILY_SPEND_CAP_USD`, release the
   run back to `queued` and sleep 10 minutes.
3. Resolve the panel (Section 7) and build the job file.
4. Run PHP, parse the result, insert `aeo_result` rows, update run totals and cost.
5. Send the "report ready" email. Mark `done`.
6. On error: record it, leave for retry until 3 attempts, then `failed` and email the admin.

One run at a time in v1. Concurrency is inside the panel.

---

## 6. Data Model

New Drizzle tables in `src/lib/db/schema.ts`, one migration.

### `aeo_panel` — canned vertical panels

| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| slug | text unique | `hdd-trenchless` |
| name | text | |
| questions | jsonb | `[{ c, q }]` with slot placeholders |
| directory_domains | jsonb | string[] |
| reference_domains | jsonb | string[] — non-competitors for this vertical |
| version | integer | bump on edit |
| is_active | boolean | |
| created_at, updated_at | timestamp | |

### `aeo_request` — one per form submission

| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| email | text | lowercased |
| business_name | text | |
| domain | text | normalized: lowercase, no scheme, no `www.` |
| service | text | free text, e.g. "horizontal directional drilling" |
| city, state | text | |
| panel_slug | text null | chosen vertical, or null → generated |
| contact_consent | boolean | |
| verify_token_hash | text | sha256 of a 32-byte random token |
| verify_expires_at | timestamp | 24 hours |
| verified_at | timestamp null | |
| ip_address | text | |
| lead_status | enum | `new`, `contacted`, `won`, `ignored` |
| run_id | uuid null fk → aeo_run | set at verification; may point to a reused run |
| created_at | timestamp | |

Indexes: `domain`, `email`, `created_at`.

### `aeo_run` — the job and the report

| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| public_id | text unique | 24 chars, `randomBytes(18).toString('base64url')` — the report URL |
| domain | text | |
| tier | enum | `snapshot` (v1), `full` (later) |
| engines | jsonb | `["perplexity"]` |
| panel_source | enum | `canned`, `generated` |
| panel_slug, panel_version | text, integer null | |
| status | enum | `queued`, `running`, `done`, `failed` |
| attempts | integer | default 0 |
| locked_at | timestamp null | running: last heartbeat; queued: when the failed attempt ended |
| lease_token | uuid null | set on claim; every write back to the run requires it |
| question_count | integer | |
| cited_count | integer | own site cited by ≥ 1 engine |
| cost_usd | numeric | |
| error | text null | |
| created_at, started_at, finished_at | timestamp | |

Indexes: `(status, created_at)`, `domain`, `public_id`.

### `aeo_result` — one row per question × engine

| Column | Type |
|---|---|
| id | uuid pk |
| run_id | uuid fk → aeo_run, cascade |
| category, query, engine, model | text |
| own_cited, name_mentioned, directory_only | boolean |
| own_rank | integer null |
| rivals, sources | jsonb |
| answer | text |
| input_tokens, output_tokens, searches | integer |
| cost_usd | numeric |
| error | text null |

Index: `run_id`.

---

## 7. Panels and Questions

### 7.1 Vertical selection

The form offers a vertical dropdown built from active `aeo_panel` rows, plus
"Something else." Choosing a vertical sets `panel_slug`; "Something else" leaves it null.

### 7.2 Canned panel

Questions carry slots filled from the request:

| Slot | Source |
|---|---|
| `{service}` | form |
| `{city}`, `{state}` | form |
| `{business}` | form |
| `{state_permit_agency}` | lookup table in `src/lib/aeo/states.ts` (NJ → NJDOT, PA → PennDOT, …) |

A question whose slot can't be filled is dropped.

**Snapshot sampling:** 20 questions, stratified across categories, always including at
least 4 "who does this near me" questions and at least 2 each from cost and permits
where the panel has them. Deterministic per domain (seeded by domain), so two runs for
the same business ask the same questions.

**First canned panel:** `hdd-trenchless`, converted from
`/Users/saxon/SaxonAEO/visibility-panel/clients/eastcoastutility.json` — its 116
questions become slotted templates, and its directory and reference lists carry over.

### 7.3 Generated panel (fallback)

For "Something else":

1. Worker fetches the visitor's homepage (Section 9.4 applies).
2. Extracts visible text, capped at 8,000 characters.
3. One Claude call (`claude-sonnet-5`, structured output) returns 20 questions across
   the standard categories plus a short list of likely non-competitor domains.
4. Run proceeds as normal; `panel_source = generated`.

The report labels generated panels as lower confidence.

Admin view shows a count of generated runs per stated service, so a vertical with ~10
submissions can be promoted to a canned panel.

---

## 8. Public Flow

### 8.1 Landing page (`/`)

- Headline: how AI assistants see your business, in plain language
- Form: business name, website, service, city, state, vertical, email, contact consent
- Cloudflare Turnstile widget
- One sentence on method and that it's free
- Link to privacy policy

### 8.2 Submit — `POST /api/aeo/requests`

In order, stopping at the first failure:

1. Validate with Zod. Normalize domain.
2. Verify Turnstile server-side.
3. Rate limits (Section 9.1).
4. Create `aeo_request` with a hashed verification token.
5. Send verification email.
6. Respond "check your email." The response is identical whether or not the email is
   new, so the form can't be used to probe who has submitted.

### 8.3 Verify — `GET /check/verify?token=…`

1. Hash the token; find an unexpired, unverified request. Mark verified.
2. **Reuse check:** if a `done` snapshot run for this domain exists from the last 30
   days, point the request at it and email that report link. No new spend.
3. Otherwise create an `aeo_run` (`queued`) and link it.
4. Show a "your report is being prepared" page — typically a few minutes.

### 8.4 Report — `/report/{publicId}`

Shown free:

- Cited on X of 20 questions
- Result by category
- Top 5 domains cited instead, with counts
- Three example questions with what the assistant said
- Method, and plainly: one assistant (Perplexity), 20 questions, date run
- Generated-panel confidence note when applicable

Behind the call to action:

- The remaining questions and answers
- Multi-assistant comparison
- The fix plan

Page sends `noindex` and `X-Robots-Tag: noindex`. Status `queued` / `running` shows a
waiting state that refreshes every 15 seconds.

Call to action: book a call with Saxon AEO for the full three-assistant audit.

### 8.5 Emails

| Email | Trigger | Contains |
|---|---|---|
| Verify | submit | link, 24-hour expiry note |
| Report ready | run done | score line + report link |
| Admin: run failed | 3 attempts | request, error |

Plain HTML through the existing `src/lib/email/provider.ts`.

---

## 9. Abuse, Cost, and Security Controls

### 9.1 Rate limits

| Key | Limit |
|---|---|
| IP | 3 submissions / 24 h |
| Email | 2 submissions / 24 h |
| Domain | 1 new run / 30 days (reuse otherwise) |
| Verify endpoint, per IP | 20 / hour |

**Fail closed on spend paths.** `src/lib/rate-limit.ts` deliberately fails *open* when
Redis is unreachable. That is right for login and wrong here — a Valkey outage would
remove every limit on a path that spends money. Add a `failClosed` option and use it for
AEO submission.

### 9.2 Daily spend cap

`AEO_DAILY_SPEND_CAP_USD` (start at $10). Enforced in the worker before each run.
Runs wait, they are never dropped.

### 9.3 CSP update for Turnstile

`src/proxy.ts` currently allows only `'self'`, and has no `frame-src`, so the Turnstile
widget would be blocked. Add `https://challenges.cloudflare.com` to `script-src`,
`connect-src`, and a new `frame-src`.

### 9.4 Fetching visitor-supplied URLs

The generated-panel step fetches a URL a stranger typed. Guard against server-side
request forgery:

- `https:` or `http:` only
- Resolve DNS and reject private, loopback, link-local, and metadata ranges
  (e.g. `10/8`, `172.16/12`, `192.168/16`, `127/8`, `169.254/16`, `::1`, `fc00::/7`)
- Re-check on every redirect; maximum 3 redirects
- 10-second timeout, 2 MB response cap, `text/html` only

### 9.5 Tokens and IDs

Verification tokens: 32 random bytes, sha256 stored, single use, 24-hour expiry.
Report IDs: 18 random bytes, base64url. Never expose `aeo_request.id` or email publicly.

### 9.6 Before opening to the public

Rotate the `akmadmin` database password, as `DEPLOY.md` already instructs.

---

## 10. Admin

Behind the existing login.

### `/dashboard/aeo`

Table of requests, newest first: date, business, domain, vertical, email, verified,
cited X/20, panel source, lead status, cost. Filters: vertical, lead status, verified,
score range. Header shows today's spend against the cap and queue depth. CSV export.

### `/dashboard/aeo/[runId]`

Request details, every question and full answer, sources, rivals, cost, errors, and the
public report link. Lead status control. "Re-run" button (admin-only, bypasses the
30-day reuse and the spend cap).

Nav: replace the analytics items with **Leads**.

---

## 11. Configuration

Additions to `.env.production.example`:

```bash
# --- AEO engines ---
PERPLEXITY_API_KEY=CHANGE_ME
# OPENAI_API_KEY=CHANGE_ME      # full-audit tier, later

# --- Cloudflare Turnstile ---
NEXT_PUBLIC_TURNSTILE_SITE_KEY=CHANGE_ME
TURNSTILE_SECRET_KEY=CHANGE_ME

# --- AEO controls ---
AEO_DAILY_SPEND_CAP_USD=10
AEO_SNAPSHOT_QUESTIONS=20
AEO_WORKER_POLL_MS=3000
AEO_ADMIN_EMAIL=wfleonard@saxonenterprises.net
```

`ANTHROPIC_API_KEY` (already present) serves generated panels.

---

## 12. Cost Model

| Item | Per snapshot |
|---|---|
| 20 questions × Perplexity `sonar` | ~$0.12–0.15 |
| Generated panel (one Claude call) | a few cents, when used |
| Verification + report emails | negligible |

At the $10 default cap: roughly 60–80 snapshots a day before runs start waiting.

---

## 13. Privacy

- Privacy policy page: what is collected (email, business name, website, IP), why, how
  long, and how to request deletion.
- Contact consent checkbox, unchecked by default. Only consenting leads get follow-up.
- Follow-up email follows CAN-SPAM: physical address, clear unsubscribe.
- Admin action to delete a request and its run on request.

---

## 14. Milestones

Each milestone ends in something verifiable.

| # | Milestone | Done when |
|---|---|---|
| M0 | **Repo prep** — tag `analytics-saas-v0`, create `aeo`, remove analytics nav/pages/cron routes | App builds; `/dashboard` shows only a placeholder Leads page |
| M1 | **Schema + panel job mode** — migration, `panel/` copied in, `job` command | `php panel/panel.php job` runs a 3-question file against Perplexity and writes a valid result |
| M2 | **Worker** — container, claim loop, spend check, result storage | Inserting a `queued` run by hand produces `done` with result rows; killing the worker mid-run leads to a reclaim and completion |
| M3 | **Public flow** — form, Turnstile, rate limits, verification, reuse check | Submit → email → verify → run queued; second submission for same domain reuses the run |
| M4 | **Report + emails** | Report page renders from a real run; "report ready" email arrives |
| M5 | **Panels** — `hdd-trenchless` canned panel, generated fallback with SSRF guard | ECU domain via canned panel and one unrelated business via generated panel both produce reports |
| M6 | **Admin + launch** — lead list, run detail, CSV, DB password rotated, deploy | Full end-to-end on businesspulse.app with the spend cap set |

---

## 15. Testing

**Unit (Jest):** token generate/verify/expiry, domain normalization, slot filling and
dropped questions, stratified sampling determinism, spend-cap check, fail-closed rate
limit, SSRF guard (private IPs, redirect to private IP, non-HTML).

**Panel:** `panel/tests/smoke.php` runs during the worker image build, plus a new case
for the `job` command using a recorded Perplexity response (no network).

**Integration:** worker against a local Postgres with a stubbed PHP result file.

**Live check before launch:** one real snapshot per panel source on production with
`AEO_SNAPSHOT_QUESTIONS=5`.

---

## 16. Open Decisions

1. **Panel engine's long-term home.** *Decided 2026-09-15:* `panel/` here is canonical.
   `SaxonAEO/visibility-panel` keeps client profiles, run history, and reports, and runs
   this engine through its `./panel` wrapper, which sets `PANEL_HOME`.
2. **Brand.** An unrelated, actively publishing magazine uses "Business Pulse" at
   businesspulse.com. Check the trademark before spending on the brand.
3. **Report detail in the free tier.** Three example questions is a starting point;
   adjust after seeing which reports convert to calls.
4. **Booking link.** Calendly or equivalent for the call to action — to choose.
