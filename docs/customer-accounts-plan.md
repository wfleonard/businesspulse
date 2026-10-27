# BusinessPulse customer accounts — plan

**Status:** approved October 26, 2026 · A1 (roles) built October 27 · for Bill Leonard
**Replaces:** "no customer login" in `aeo-build-spec.md` §4.3 and `monitor-tier-plan.md` §3.1

BusinessPulse moves toward SaaS: businesses get their own accounts. The free snapshot
stays exactly as it is, with no account needed, and an account is what turns one report into
a history. Monitor ($49/mo) requires one.

---

## 1. Decisions (October 26, 2026)

| Question | Decision |
|---|---|
| Does the free snapshot need an account? | **No.** It stays anonymous with email verification, so the funnel that feeds Saxon AEO is unchanged |
| Why create a free account? | **Keep your reports and track changes:** every snapshot and 30-day re-check for your website in one place |
| Does Monitor need an account? | **Yes.** Subscribers sign up, then check out. Cards, invoices, and cancellation still go through the Stripe portal |
| Who sees the lead list and admin tools? | **Admins only.** Today any login sees every lead, so roles ship before anyone can sign up |
| How do admins get in? | Request access and approval (built October 26). Approved people are admins |

## 2. Where the offer appears

- **Report page:** "Create a free account to keep this report and see how it changes," with
  the verified email filled in. Shown under the results, next to Book a call, never instead
  of it.
- **Report-ready and 30-day emails:** one line with the same offer.
- **Monitor button:** "Track this monthly — $49" goes to sign-up (or sign-in) first, then
  Stripe Checkout.
- **Homepage and /scan:** unchanged. The snapshot form stays the only call to action.

## 3. What has to change

### 3.1 Roles first

- `user.role`: `admin | customer`, default `customer`. Migration sets every existing user
  to `admin`.
- `requireAdmin()` next to `requireSession()`. Every `/dashboard` page, server action, and
  the CSV export switch to it. A customer who opens `/dashboard` is sent to `/account`.
- Approving an access request creates an `admin`. Self sign-up creates a `customer`.
- Tests: a customer session gets nothing from any admin page, action, or export.

**Nothing in 3.2 ships until this is live.** Turning on sign-up before roles would show
every lead to anyone who registers.

### 3.2 Self-serve sign-up

- `/signup`: name, email, password (12+ characters), Turnstile, and rate limits like the
  snapshot form.
- better-auth sign-up with `requireEmailVerification`, using the same email style as the
  password links. `BP_ALLOW_SIGNUP` becomes `true` only after 3.1 is deployed.
- Sign-in and request-access pages gain "Create a free account." Request access stays for
  admins.

### 3.3 Owning reports

An account owns the snapshots for its **verified email**: the same proof the snapshot
already asks for.

- `aeo_request.user_id` (nullable). On email verification, and on every sign-in, link
  verified requests with that email that aren't linked yet.
- A request made while signed in is linked at once and skips the email check, since the
  account's email is already verified.
- **Retention:** the 120-day sweep skips requests linked to an account; they're kept while
  the account exists. Deleting the account deletes its requests and runs. Update the
  privacy page to say both.
- Reports keep their public, unlisted links, so sharing still works.

### 3.4 Customer area — `/account`

- **Reports:** each website, its snapshots and re-checks newest first, cited count and the
  change since the last one, and links to the reports.
- **Run again:** a fresh snapshot for one of their websites, at most once every 30 days,
  under the same reuse rule and daily spend cap as public snapshots.
- **Monitor:** status, next run date, and Manage subscription (Stripe portal).
- **Settings:** name, password, and delete account.
- Same header as the public site, not the admin dashboard.

### 3.5 Admin

- `/dashboard/users` gains a role column and splits admins from customers.
- `/dashboard/aeo` shows whether a lead has an account, and the funnel adds "created
  account" between report viewed and booked call.

## 4. Milestones

Each one ships on its own and is checked before the next starts. They come before
Monitor M3 (Stripe), which now needs an account to attach the subscription to.

| # | Milestone | Done when |
|---|---|---|
| **A1** | **Roles.** `user.role`, `requireAdmin()` everywhere in `/dashboard`, `/account` placeholder | A customer test user can't load or call anything admin, by page, action, or export |
| **A2** | **Sign-up and verification.** `/signup`, Turnstile, verification email, `BP_ALLOW_SIGNUP=true` | A new customer signs up, verifies, signs in, and lands on `/account` |
| **A3** | **Owning reports.** `aeo_request.user_id`, linking on verify and sign-in, retention exemption, privacy page | A past snapshot appears in the account for its verified email; one for another email doesn't |
| **A4** | **Customer area and offer.** `/account` reports and run again, the report-page and email offer, admin columns | A visitor goes snapshot → report → account → sees history and re-runs after 30 days |

About a week of build in total. Then Monitor continues at M1, with M3 attaching the
subscription to the account.

## 5. Open questions

- **More than one website per free account?** Start with any website whose snapshot was
  verified with the account's email; revisit if web designers want to add clients.
- **Teams:** one login per account to start. Several people under one business comes later,
  if Monitor customers ask.
