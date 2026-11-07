# BusinessPulse Pulse — $100 report runs in a client account

**Status:** plan approved November 6, 2026 · P2 (sign-up), P3 (business profile and silo), and P4 (Pulse runs on the server) built November 6 · business panels added November 7 (`business-panel-plan.md`) · P5 (business brief) built November 7 · for Bill Leonard
**Replaces:** the $49 Monitor plan (`monitor-tier-plan.md`). **Builds on:** customer
accounts (`customer-accounts-plan.md`); roles (A1) are live.

A business signs up for a free BusinessPulse account, pays $100 when it wants a new full
AEO report, and keeps every report it has paid for. Each report shows where AI search
leaves the business out and explains what to fix. Saxon AEO offers to fix the current
issues for a one-time $500.

---

## 1. Decisions (November 6, 2026)

| Question | Decision |
|---|---|
| How the $100 works | **Pay per run.** Card payment, then the run starts. At most one run per business every 30 days. No subscription |
| Monitor ($49/mo) | **Replaced by Pulse.** The waitlist offer on reports becomes the Pulse offer |
| Accounts | **Free sign-up** with email verification; pay from inside the account |
| Tenant | **One business per account:** its main website plus any other sites it runs |
| Industry with no question set | **AI drafts a full set from their site, Bill approves it**, then the run starts |
| The $500 fix | **Request, then invoice.** The client asks from the report, Bill confirms the scope and sends a payment link. One-time, covers the issues in that report |
| Free audit with a call | **Kept for Core prospects.** Pulse is the self-serve way to get the audit without a call |
| Free snapshot | **Unchanged.** Anonymous, no account, the front door |

## 2. The product

| | Free snapshot | **Pulse run — $100** | $500 fix | Saxon AEO Core |
|---|---|---|---|---|
| Questions | 20 | **The industry's full set**, about 60 to 104 | | Full set |
| Assistants | Perplexity | **ChatGPT, Claude, Perplexity, Gemini** | | All four |
| When | Once, plus a 30-day re-check | **When the client pays,** at most every 30 days | Once | Monthly |
| Report | Public link by email | **In their account, kept for as long as the account exists**, with what to fix | Saxon fixes the issues in one report | Audit, plan, and the work |
| Price | Free | **$100 per run** plus NJ sales tax | $500 one-time | $1,500/mo, six months |

**Unit economics.** A four-assistant run of about 100 questions costs roughly $25 to $30 in
AI spend (the East Coast Utility baseline was estimated at $27), mostly Claude. The fix
write-up adds well under $1. Stripe takes about $3.20. That leaves about **$65 to $70 per
run.** Measure the real number in P4 before launch.

**What the copy may claim** (unchanged rules): which buyer questions cite the business, on
which assistants, and who is cited instead. Never Google rank, site health, listings, or
Google AI Overviews. The fix section talks about pages and settings that help AI
assistants read and cite the site, not about Google rankings.

## 3. The client's path

1. **Sign up** (free): name, email, password, then verify the email. Any free snapshots
   verified with that email appear in the account.
2. **Business profile:** name, main website, other websites, industry (from the list, or
   "Something else"), main service, town and state. One business per account.
3. **Run a Pulse report:** the account shows one of these states:
   - **Ready:** "Run a new report for $100" goes to Stripe Checkout.
   - **Too soon:** "Your next report is available on December 6." No payment is taken.
   - **Preparing your questions:** paid, and the industry's question set is waiting
     for Bill's approval (usually within 1 to 2 business days).
   - **Running:** a progress note; reports take longer than a snapshot.
   - **Done:** an email arrives, and the report is in the account.
4. **Read the report** in the account: results by assistant, by buyer intent, who is cited
   instead, the trend since the last Pulse run, every question, and **What to fix.**
5. **Ask Saxon to fix it:** "Fix these issues for $500" sends the request with the issue
   list. Bill confirms the scope and sends a Stripe payment link.

## 4. What has to be built

### 4.1 Accounts and the tenant

- **Sign-up and verification** (accounts A2): `/signup`, Turnstile, rate limits,
  better-auth email verification, `BP_ALLOW_SIGNUP=true` once it's built. Sign-up makes a
  `customer`; roles are already enforced.
- **`business` table:** `user_id` (unique for now: one business per account), name,
  domain, other domains, panel slug or "custom", service, city, state, created and updated
  dates.
- **Ownership** (accounts A3): `aeo_request.business_id` and `aeo_run.business_id`. Free
  snapshots verified with the account's email link to it. Accounts keep their data past
  the 120-day sweep; deleting the account deletes the business, its runs, and its reports.
  Privacy page updated.
- **Silo rule:** every customer page and action loads data only through the signed-in
  user's business. Tests check that one customer can never read another's runs, reports,
  orders, or fix requests, by page, action, or ID guessing.
- **As built (P3):** `/account/business` sets up or edits the profile; "Something else" asks
  what the business does (`business.custom_industry`, for the P7 draft). Snapshots link
  when their email matches the account's (form snapshots only, never outbound
  prospects), on save and on each visit to `/account`. Removing a login deletes its
  business, linked requests, and the reports no other request uses. Self-serve account
  deletion is by email for now.

### 4.2 Payment

- **`pulse_order`:** business, Stripe Checkout session and payment intent, amount, tax,
  status (`pending`, `paid`, `refunded`), the run it paid for, created and paid dates.
- **Stripe Checkout,** one-time payment, $100 plus Stripe Tax for New Jersey. Created
  only when the 30-day rule allows, so nobody pays for a run they can't start.
- **Webhook** `POST /api/stripe/webhook`, signature-verified: `checkout.session.completed`
  marks the order paid and queues the run, or the panel draft if the industry needs one.
  `charge.refunded` marks a refund.
- **Receipts** come from Stripe. A **terms of service page** (Stripe requires it) states
  the policy: no refunds once a report is delivered; a run that fails is re-run free.
- **30-day rule:** counted from the start of the business's last paid run.

### 4.3 The run on the server

The full audit runs on Bill's Mac today. It moves into the BusinessPulse worker.

- **`pulse` run tier:** every question in the industry set, capped at 104, all four
  assistants, no daily free-snapshot cap. A separate paid ceiling
  (`AEO_PAID_DAILY_CAP_USD`, start at $150) stops a runaway bug at a known number.
- **Keys:** the server's `.env` needs `OPENAI_API_KEY`, `GEMINI_API_KEY`, and
  `ANTHROPIC_API_KEY` next to the Perplexity key. Bill adds these.
- **Size:** about 400 answers versus 20 for a snapshot. Split each run into one job per
  assistant so a slow assistant doesn't hit the job timeout, and retry only failed
  answers, the way `panel retry` does today.
- **Admin start:** Bill can start a Pulse run for any business from the dashboard, free,
  for testing and for Core prospects.
- **As built (P4):** a second worker service, `worker-pulse` (`AEO_WORKER_LANE=pulse`),
  claims only Pulse runs, so a run of most of an hour never holds up a free snapshot.
  Assistants run in order Perplexity, Gemini, ChatGPT, Claude, each as its own panel job
  (`AEO_PULSE_JOB_TIMEOUT_SECONDS`, default 3600; `AEO_PULSE_CONCURRENCY`, default 4,
  Perplexity held to 1), saved as it finishes. After a rate limit an assistant waits
  `AEO_PULSE_RATE_LIMIT_PAUSE_SECONDS` (90) and re-asks its gaps, twice at most, in the same
  attempt. Retries ask only the missing question and
  assistant pairs. `/dashboard/pulse` starts runs and shows answers per assistant, spend,
  and time. Pulse report links are admin-only until P5. Businesses with a custom industry
  can't start a run until P7.

### 4.4 The report and What to fix

- A **private report page** in the account (`/account/reports/[id]`): signed-in owner
  only, unlike the public snapshot link. It reuses the snapshot report's sections and
  merges four assistants per question, as `report.ts` already does.
- **Trend:** cited count overall, per assistant, and per question type against the last
  Pulse run.
- **What to fix,** built from two kinds of evidence:
  - **The answers:** buyer intents where the business is never cited, questions where a
    directory or competitor is cited instead, and answers that name the business with no
    source.
  - **Site checks** (a fixed list, read from the live site): AI crawlers allowed in
    `robots.txt`; Organization or LocalBusiness structured data; FAQ structured data on
    question pages; whether the towns served are named; whether there are pages answering
    cost, permit, and how-it-works questions; whether key text is in the page rather than in
    images or scripts.
  - Claude turns the evidence into a short, prioritized list: each issue, why it matters
    to AI search, and what fixing it involves. Every item points to its evidence.
- We design the report's wording and layout together as the account area is built (P5).
- **Email** when the report is ready, with a link to sign in.

### 4.5 Question sets for new industries

> **Replaced November 7, 2026** by business panels (`business-panel-plan.md`): every
> client gets a panel built from its own website and approved by Bill, so a new industry
> is part of the normal flow. The notes below are kept for history.

- The generator that writes 20 questions for unknown industries grows into a **full-set
  draft** (60 to 100 questions across every question type), from the business's site and
  profile.
- The draft lands in the **panel backlog** (`/dashboard/panels/backlog`) marked "client
  waiting." Bill edits and approves it; approval publishes the panel and starts the paid
  run. The client is emailed that the run has started.
- The new set joins the industry list, so the next business in that industry runs at
  once.
- Bill is emailed when a draft is waiting.

### 4.6 The $500 fix

- **`fix_request`:** business, the report, the issue list at the time of the request,
  status (`requested`, `quoted`, `paid`, `in_progress`, `done`, `declined`), Stripe payment
  link and dates, notes.
- **In the report:** "Fix these issues for $500, one time." It confirms what's included
  (the issues listed in this report) and sends the request. Bill is emailed.
- **Dashboard:** fix requests with their issue lists. Bill confirms the scope, sends the
  payment link (created through Stripe), and the webhook marks it paid. Bill moves it to
  in progress and done; the client sees the status in their account.
- The next Pulse run shows what changed after the fix.

### 4.7 Admin

- **Pulse clients:** business, runs, last run, orders, revenue, AI spend per run, and fix
  requests.
- Panel drafts waiting, and failed runs, at the top of the dashboard.
- Any run that costs over $40 is flagged.

### 4.8 Replacing Monitor and updating copy

- Remove the $49 Monitor offer and waitlist from snapshot reports; the report offers
  Pulse ("Get the full report across four AI assistants, $100") next to Book a call.
  `/monitor` points to Pulse.
- Email the Monitor waitlist once when Pulse launches.
- Update the cost guide FAQ ("What do BusinessPulse and Saxon AEO charge?"), the
  comparison page, the tools article, and `llms.txt`: the free snapshot, the $100 Pulse
  run, the $500 fix, and Core at $1,500/mo with the audit free on a call.
- Mark `monitor-tier-plan.md` as replaced.

## 5. Milestones

Each one ships on its own and is checked before the next starts. Bill is told at the end
of each one whether to update the server and what to check.

| # | Milestone | Done when | Rough effort |
|---|---|---|---|
| **P1** | **Roles** (accounts A1) | Live October 27 | Done |
| **P2** | **Sign-up and verification** (A2) | A new customer signs up, verifies, signs in, and lands on `/account` | 1 day |
| **P3** | **Business profile and silo** (A3) | A customer sets up their business; past snapshots for their email appear; silo tests pass | 1–2 days |
| **P4** | **Pulse runs on the server.** `pulse` tier, four assistants, jobs per assistant, paid cap, admin start | Bill runs ECU and Primos from the dashboard; real cost and time are recorded | 2 days |
| **P5** | **Business brief.** Site deep dive on profile save, brief with sources, client confirms or corrects it (`business-panel-plan.md`) | Primos Maternos and one multi-trade contractor get a brief the client would sign off | 2 days |
| **P6** | **Business panels.** Draft from the brief and industry libraries, Bill's review and approval, versions; Pulse runs ask the approved panel | Primos re-runs on its own panel; Bill agrees every question fits; compared with the Nov 6 run | 2–3 days |
| **P7** | **Report in the account, with What to fix v1** | The client reads their runs in their account, with fixes that point to evidence; wording agreed with Bill | 2–3 days |
| **P8** | **Stripe.** Checkout, tax, webhook, 30-day rule, terms page, "questions being prepared" state. Test mode end to end | A test card buys a run that starts and finishes; a second purchase inside 30 days is refused | 2 days |
| **P9** | **$500 fix requests** | A client requests a fix, Bill sends the link, a test payment marks it paid | 1 day |
| **P10** | **Launch.** Monitor offer replaced, copy updated, live Stripe keys, waitlist emailed | A real client can sign up, pay, and read their report | ½ day |

The old P7 (new-industry question sets) is replaced by P5 and P6.

About three weeks of build in total.

## 6. Still open

- **Sharing a report:** reports are private to the account. A share link the client can
  send to their web designer may be worth adding after launch.
- **Several businesses per account** for web designers and agencies: later, if asked.
- **NJ sales tax** on reports and fix work: confirm with the accountant before P6 goes
  live; Stripe Tax handles collection either way.
