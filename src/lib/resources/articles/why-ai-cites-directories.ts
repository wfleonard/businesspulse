import type { ResourceArticle } from '../types'

export const whyAiCitesDirectories: ResourceArticle = {
  slug: 'why-ai-search-cites-directories-instead-of-your-website',
  type: 'explainer',
  title: 'Why AI search cites Angi and Yelp instead of your website',
  summary:
    'When buyers ask an AI assistant who to hire nearby, it usually answers from directories. In our snapshots, directories were cited on 25 of 35 "near me" answers, and the businesses’ own sites on 8.',
  industries: [],
  published: '2026-09-21',
  body: `
## What we measured

In September 2026 we ran seven BusinessPulse snapshots, one business in each of seven industries: directional drilling, pools and hot tubs, landscaping, commercial roofing, electrical contracting, HVAC and plumbing, and municipal advisory. Each snapshot asked Perplexity, with live web search, 20 questions buyers in that industry ask. That is 140 answers, and the sources each one cited.

The businesses' own websites were cited on 11 of the 140. Directories were cited on 66.

## Directories dominate the questions that matter most

The gap is widest on the question closest to a hire: who does this work near me.

| Question type | Answers | A directory cited | The business's own site cited |
|---|---|---|---|
| Who does this near me | 35 | 25 (71%) | 8 (23%) |
| Everything else | 105 | 41 (39%) | 3 (3%) |

The directories that came up most were the familiar ones. Across the 140 answers, Angi was cited on 23, HomeGuide on 14, the Better Business Bureau on 10, and Yelp on 9, with Yellow Pages, HomeAdvisor, Fixr, and Thumbtack close behind.

## Why assistants reach for directories

We can see what an assistant cites, not why it chose it, so this is our reading of the pattern rather than a rule.

- **The question asks for a list, and a directory is a list.** "Who installs pools near Lancaster" is answered in one step by a page that already names ten companies with ratings. A single contractor's homepage answers it for one company.
- **A directory states where it works.** Its page for your town says so in plain words. Many small business sites never name the towns they serve, so there is nothing tying them to the question.
- **Reviews are in one place.** An assistant weighing who to recommend finds ratings on the directory page and rarely on the business's own site.

## What it costs you

A directory citation isn't nothing: the buyer may still find you. But the directory owns the lead. You sit on its page next to your competitors, often below whoever pays for placement, and on several of these sites a lead reaches you only as a paid referral.

It is also the easiest position to lose, because nothing about it is yours.

## How to take questions back

You don't need to beat every directory everywhere. Pick the questions where one is cited in your place and give the assistant a better page to cite.

- **Say where you work, on your own site.** Name your service area and the towns you cover in plain text, on a page about the service. One clear service-area page beats a hundred near-identical town pages, which search engines treat as spam.
- **Put your proof on your own pages.** Licenses, certifications, years in business, and a few real reviews, where an assistant reading your site will find them.
- **Answer what a directory can't.** Directories publish national cost averages and general advice. They can't say what the job costs in your towns, which permit your town requires, or how you'd handle a difficult site. The businesses we measured were cited on none of the cost, permit, or how-it-works questions, so that is the opening. [Why cost questions go to cost guides](/resources/ai-search-cost-questions-cite-cost-guides) covers those in detail.
- **Keep your directory listings, and keep them consistent.** The same name, address, and phone number everywhere helps an assistant confirm you are one real business. The goal is to be cited alongside the directories, then ahead of them.

## What this sample can and can't tell you

Seven businesses is a pattern, not a benchmark: one per industry, one assistant, answers collected September 15 to 18, 2026. The businesses aren't named and no single industry's numbers are shown. A [free snapshot](/) runs the same 20-question check on your own business, so you can see whether the pattern holds for you.
`,
}
