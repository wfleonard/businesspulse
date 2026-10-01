# BusinessPulse Monitor — $49/month build plan

**Status:** approved October 1, 2026 · building M0 · for Bill Leonard

A paid monthly tier for businesses that want to track their own AI search visibility and
do the work themselves. It is a BusinessPulse product: it is not offered in Saxon AEO
proposals. It still feeds Core: a subscriber who watches the same cost questions stay at
zero for three months is the best lead we will get.

---

## 1. The product

| | Free snapshot | **Monitor — $49/mo** | Saxon AEO Core |
|---|---|---|---|
| Questions | 20 | **50**, the same 50 every month | Full set, 64–116 |
| Assistants | Perplexity | **ChatGPT, Claude, Perplexity, Gemini** | All four |
| How often | Once, plus a 30-day re-check | **Monthly** | Monthly |
| Report | One report | **Monthly report with changes since last month** | Audit, plan, and the work |
| Term | — | **Month to month, cancel anytime, no refunds** | Six months |

**Who it's for:** owners and in-house marketers who will write their own pages, and web
designers watching a client site. One domain per subscription.

**Why these numbers:**

- **50 questions** covers every question type in an industry set with room to spare, and
  stays affordable on Claude, the most expensive assistant. The sample is already
  deterministic per domain (`sampleQuestions` hashes the domain), so the same 50 come back
  every month and the comparison is fair.
- **Four assistants** is the difference from Otterly ($29, 15 questions, add-ons per
  assistant) and the reason to pay $49 rather than check by hand.
- **Monthly, not daily.** Competitors sell daily tracking. A small business doesn't act on
  daily changes, and monthly keeps the cost per subscriber low.
- **No free trial.** The free snapshot is the trial.

### Unit economics

From measured per-question costs (business plan §5):

| Assistant | Per question | 50 questions |
|---|---|---|
| Claude | ~$0.12 | ~$6.00 |
| ChatGPT | ~$0.05 | ~$2.50 |
| Gemini | ~$0.03 (estimate; measure in M1) | ~$1.50 |
| Perplexity | ~$0.006 | ~$0.30 |
| **Total** | | **~$10–12** |

At $49: about $11 in AI spend plus about $1.72 in Stripe fees leaves **~$36 a month, ~74%**.
NJ sales tax is collected on top of the $49, so it doesn't change the margin.
Retries on failed answers add a little; the per-run `cost_usd` will show the real number.

---

## 2. What already exists

More of this is built than it looks:

- **Multi-assistant runs.** `aeo_run.engines` is per run, the worker passes it to the PHP
  panel (`buildJob`), and the report merges several assistants per question
  (`report.ts`). Only Perplexity has been used in production.
- **A tier field.** `aeo_run_tier` is `snapshot | full`; the worker already asks every
  question for `full` (`worker/index.ts:124`).
- **Repeat runs and comparison.** The 30-day re-check (`recheck.ts`) already schedules a
  fresh run for a past request and emails a comparison with the first one
  (`compareCited` in `emails.ts`). Monitor is this, monthly, for paying customers.
- **Per-run spend tracking** (`cost_usd`) and a cap bypass flag (`bypass_spend_cap`).
- **Deterministic question samples** per domain.

## 3. What has to change

### 3.1 Billing — Stripe, no customer login

The build spec says free users never get a login. Keep that: subscribers don't need one
either.

- **Stripe Checkout** in subscription mode starts the subscription. Entry points: a
  "Track this monthly — $49" button on every snapshot report (domain, industry, and town
  already known), and a link on the cost guide and comparison pages.
- **Stripe Customer Portal** handles cards, invoices, and cancellation. Every monthly email
  carries a "Manage subscription" link to it.
- **Webhook** `POST /api/stripe/webhook`, signature-verified:
  `checkout.session.completed` creates the subscription; `customer.subscription.updated`
  and `.deleted` track status; `invoice.payment_failed` pauses runs after Stripe's retries
  give up.
- **Sales tax:** turn on Stripe Tax and collect New Jersey sales tax on Monitor.
- **Before going live:** a terms of service page (there is only a privacy page today)
  stating the no-refund policy. Stripe requires both to be reachable from checkout.

### 3.2 Data

New table `aeo_subscription`:

| Column | Notes |
|---|---|
| `id`, `created_at` | |
| `stripe_customer_id`, `stripe_subscription_id` | unique |
| `status` | `active`, `past_due`, `canceled` |
| `email`, `business_name` | a customer record, not a lead |
| `domain`, `other_domains`, `panel_slug`, `service`, `city`, `state` | copied from the request that started it, so every month asks the same questions |
| `current_period_end`, `canceled_at` | from Stripe |
| `source_request_id` | the snapshot that converted, for funnel reporting |

And `aeo_run.subscription_id` (nullable) to tie each monthly run to its subscription.

Add `monitor` to `aeo_run_tier`, and give the tier a question count (50) in config next to
`snapshotQuestions`, instead of overloading `full`.

**Retention.** The 120-day sweep erases contact details from `aeo_request`. Subscribers live
in their own table, so the sweep doesn't touch them while active. Erase a canceled
subscriber's contact details 120 days after cancellation, and say so on the privacy page.

### 3.3 Worker

- **Scheduler** `startDueMonitorRuns()`, called next to `startDueRechecks()`: for each
  active subscription with no run in its current billing month, insert a `monitor` run with
  all four assistants. Run on the subscription's monthly anniversary, so runs spread out
  instead of landing on the 1st.
- **Spend.** Paid runs must not wait behind the $10 free-snapshot cap. Give monitor runs
  their own daily ceiling (`AEO_MONITOR_DAILY_CAP_USD`, start at $50) and leave the free cap
  alone. A runaway bug still stops at a known number.
- **Timeouts.** A monitor run is 160 answers; a snapshot is 20. At concurrency 2 that can
  pass the 600-second `AEO_JOB_TIMEOUT_SECONDS`. Measure in M1, then either raise the
  timeout for monitor runs or run one job per assistant.
- **API keys.** The production worker needs `OPENAI_API_KEY` and `GEMINI_API_KEY` in the
  server's `.env` alongside the Perplexity and Anthropic keys. Bill adds these.

### 3.4 Report and email

- **"Since last month" section** on monitor reports: cited count overall and per question
  type, questions newly won, questions lost, and new sites cited instead. Build it from
  `compareCited` and the report summary rather than a second code path.
- **By assistant:** a small table of cited count per assistant, since that is what the
  subscriber pays for.
- **Monthly email:** the headline change ("Cited on 7 of 40, up from 4"), the biggest new
  win and loss, the report link, and the Manage subscription link. It's a transactional
  email to a customer, so it goes out even to people who unsubscribed from marketing.
- **One line at the bottom of each report** saying Saxon AEO can do the work, linking to
  the cost guide. Monitor itself is never part of a Saxon AEO proposal.

### 3.5 Admin

On `/dashboard/aeo`: subscribers, status, MRR, AI spend per subscriber per month, and
failed payments. Flag any subscriber whose run cost passes $20.

---

## 4. Milestones

Each one ships on its own and is checked before the next starts.

| # | Milestone | Proves | Rough effort |
|---|---|---|---|
| **M0** | **Demand test.** "Track this monthly — $49" on reports, recording clicks like Book a call, leading to a waitlist email form | People want it before we build payments | ½ day |
| **M1** | **Monitor run by hand.** `monitor` tier, 50 questions, four assistants, started from the admin run page. Run it on two businesses (ECU and Primos) | Real cost per run, real run time, Gemini cost, the timeout question | 1–2 days |
| **M2** | **Month-over-month report and email.** Run the M1 businesses again and compare | The report is worth $49 | 2 days |
| **M3** | **Stripe.** Checkout, webhook, portal, Stripe Tax, `aeo_subscription`, terms page. Test mode end to end | Money in, tax collected, cancellation works | 2–3 days |
| **M4** | **Scheduler and spend.** Monthly runs on the anniversary, monitor spend cap, retention for canceled subscribers | It runs without Bill | 1–2 days |
| **M5** | **Launch.** Admin view, live Stripe keys, the button goes from waitlist to checkout, cost guide and comparison pages list Monitor | | ½ day |

About two weeks of build in total. **M0 and M1 come first and cost almost nothing:** if
nobody clicks the button in a month, or a run costs $25 instead of $9, we find out before
building payments.

---

## 5. Decisions (October 1, 2026)

| Question | Decision |
|---|---|
| Price | **$49 a month.** Annual billing not decided; monthly only at launch |
| Questions per month | **50** |
| NJ sales tax | **Collect it,** through Stripe Tax |
| Refunds | **None.** Cancel anytime; a month already billed isn't refunded |
| Saxon AEO proposals | **Monitor is BusinessPulse only** and isn't offered in proposals |

## 6. After launch

Update the cost guide, the tools list, the comparison page, and `llms.txt` copy to include
Monitor, and add it to the pricing memory so the three price lists stay in step.
