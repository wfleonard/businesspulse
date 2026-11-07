# Business panels — questions built from each client's own website

**Status:** plan approved November 7, 2026 · for Bill Leonard
**Part of:** the Pulse plan (`pulse-plan.md`). Replaces Pulse P7 (new-industry question sets).

## 1. The problem

Pulse runs ask an **industry panel**: one question set for every business in an industry.
The first live run, Primos Maternos on November 6, asked the "religious art" set. It covers
statues, icons, custom commissions, Etsy, and local stores. Primos sells one canvas image,
online, shipped nationwide. Questions about things a business doesn't sell or areas it
doesn't serve:

- always come back "not cited", so the report looks worse than the truth;
- send the client after the wrong fixes, including in the $500 offer;
- spend AI money on answers that tell us nothing.

Industry labels are too coarse anyway. A "roofer" may be a general contractor with roofing
as one of eight trades, or a roofing-only shop. Only the website says which.

## 2. Decisions (November 7, 2026)

| Question | Decision |
|---|---|
| Who approves a business's panel | **Bill approves every panel** before its first run |
| Does the client see the business brief | **Yes.** The client confirms or corrects it before the panel is drafted |
| When the deep dive runs | **When the business profile is saved**, so the panel can be approved before they pay |
| Free snapshots | **Unchanged** for now; they keep industry panels. Revisit once business panels prove out |

## 3. How it works

1. **Profile saved:** the client saves their business (P3). A deep dive is queued.
2. **Deep dive:** the worker reads the site, all on the same domain:
   - the homepage and `sitemap.xml`;
   - up to 25 pages, chosen by how much they say about the business: services or
     products, about, locations, service area, FAQ, pricing, and buyer pages such as
     /parishes or /commercial.
   - It uses the SSRF-guarded fetcher in `site.ts`. Page text is untrusted: it reaches the
     model only as quoted data, and the output is a fixed JSON schema.
3. **Business brief:** Claude writes it from the pages, citing the page each point came
   from. It covers:
   - **What they sell:** each service or product line.
   - **What they don't sell,** where the site makes it clear (Primos: no statues, no custom
     commissions).
   - **Who buys:** homeowners, businesses, parishes and schools, government, etc.
   - **Where they serve:** local radius, region, state, nationwide, or online with
     shipping, plus the towns named.
   - **What sets them apart:** certifications, guarantees, years in business.
   - **The matching industry panels,** often several (roofing, siding, gutters).
4. **Client confirms:** `/account` shows "Here's what we found on your site". The client
   ticks or unticks services, fixes the service area, adds anything missing, and confirms.
5. **Panel draft:** Claude builds the business's panel from:
   - the confirmed brief;
   - the matching industry panels, used as a question library;
   - the question types every report covers (cost, comparison, choosing a provider,
     problems, how it works, local or nationwide, buyer role).

   It keeps questions that fit and drops ones that don't. A national online seller gets no
   "near me" questions. It adds questions specific to the business, and tags each question
   with the service it tests and why it's there. The size follows the business's scope,
   about 40 to 104 questions. The domains lists start from the industry panels, adjusted
   for the business.
6. **Bill reviews:** Bill is emailed. `/dashboard/pulse/[business]` shows:
   - the brief and the client's corrections;
   - every question with its reason, which he can edit, drop, or add to;
   - the domains lists;
   - an estimated run cost.

   Approving publishes the panel as version 1.
7. **Pulse runs** ask the approved version. A run records the panel version it used.
8. **Changes:** a profile edit, a "my business changed" request, or Bill's own edit
   produces a new draft version that Bill approves. Reports compare like with like, and
   note when the questions changed since the last run.

**If the site can't be read** (blocked, empty, or a page builder that renders nothing),
the brief is built from the profile alone and flagged for Bill.

**Paying before approval:** the account shows "Your questions are being prepared" and the
Buy button waits until Bill approves. This is the "Preparing your questions" state the Pulse
plan already describes. Nobody pays for a run that can't start.

## 4. What has to be built

- **Tables:**
  - `business_brief`: business, the brief (JSON), pages read, status (`reading`, `ready`,
    `confirmed`, `failed`), the client's corrections, cost, dates.
  - `business_panel`: business, version, status (`draft`, `approved`, `retired`),
    questions with category, service, and reason, directory and reference domains, the
    industry panels used, model, cost, approved by and when, note.
  - `aeo_run.business_panel_id`.
- **Worker jobs:** the deep dive and the panel draft run in the snapshot worker lane, after
  any waiting snapshot. A read takes a minute or two; in the Pulse lane it could wait behind
  an hour-long run. *(Changed while building P5.)*
  - Limits: one deep dive per business per day, plus a daily cap
    (`AEO_BRIEF_DAILY_CAP_USD`, start at $25).
  - Each job's cost is recorded.
- **Crawler:**
  - Reads `sitemap.xml`, plus links from the homepage when there's no sitemap.
  - Same domain and the business's other domains only.
  - At most 25 pages and 2 MB of text, with the existing timeouts and private-address
    block.
  - Robots.txt is respected, since we identify as BusinessPulse.
- **Client pages:**
  - The brief card on `/account`, with confirm and correct.
  - Account states: "reading your site", "please confirm", "questions being prepared",
    "ready".
- **Admin pages:**
  - The review page and its editor.
  - Panels waiting for approval at the top of `/dashboard/pulse`.
  - Approval emails Bill's queue and, on approval, tells the client their questions are
    ready.
- **Pulse runs:** `planBusinessRun` asks the approved panel instead of the industry
  panel. The industry-panel path stays for snapshots.
- **Tests:**
  - The crawler stays on the domain and under the limits.
  - Page text never escapes the quoted-data block.
  - A run never starts without an approved panel.
  - Clients can't see another business's brief or panel.

## 5. Checking it on Primos Maternos

Primos is the first test:

- Build its business panel.
- Re-run it and compare the result with the generic run of November 6 and the 84-question
  local SaxonAEO baseline (runs 20 to 23).
- The panel passes when Bill agrees every question is one a real Primos buyer would ask.

Then repeat on one contractor whose site covers several trades.

## 6. Measured

- **Primos Maternos, generic panel (November 6):** 66 questions on four assistants, all
  264 answers, cited on 5 of 66, $9.80, 20 minutes. The P6 comparison baseline.
- **Primos Maternos brief (November 7, local):** 25 pages from the sitemap, about 30
  seconds, $0.24 on Claude Opus 5.5. It found the one image and its real sizes and prices,
  what isn't sold (other images, hand-painted work, pickup), parishes, schools, dioceses,
  and Spanish-speaking buyers, and national scope with no storefront.

- **Primos Maternos panel v1 (November 7, local):** drafted in about 70 seconds for
  $0.20 on Claude Opus 5.5, from the confirmed brief and the religious-art library: 79
  questions (47 from the library, 32 new), including diocese-by-name, purchase-order,
  bulk-pricing, and Spanish-language questions; no statues, commissions, Etsy, or local
  store questions. Estimated run cost about $12.
- **As built (P6):** confirming or changing a brief queues a draft version; the snapshot
  worker drafts it (briefs and drafts share `AEO_BRIEF_DAILY_CAP_USD`); Bill reviews it on
  `/dashboard/pulse/[business]` (edit, drop, add, domain lists, note, estimated cost) and
  approves it. Editing the approved version saves a new draft version. A Pulse run needs
  an approved panel and records the version it asked (`aeo_run.business_panel_id`).

## 7. Costs

- **Deep dive and draft:** about $1 to $3 per business, once, and again only when the
  business changes. Measure it on Primos.
- **Run:** a tighter panel usually means fewer questions, so a cheaper run. The
  estimated cost is shown on the review page before approval.
