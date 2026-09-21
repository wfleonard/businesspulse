import type { ResourceArticle } from '../types'

export const whyAiCitesDirectories: ResourceArticle = {
  slug: 'why-ai-search-cites-directories-instead-of-your-website',
  type: 'explainer',
  title: 'Why AI search cites Angi and Yelp instead of your website',
  summary:
    'When buyers ask an AI assistant who to hire nearby, it usually answers from directories. Across 27 industries, directories were cited on 106 of 135 "near me" answers, and the businesses’ own sites on 35.',
  industries: [],
  published: '2026-09-21',
  body: `
## What we measured

In September 2026 we ran 27 BusinessPulse snapshots, one business in each of 27 industries, from roofing, HVAC, and landscaping to dentists, financial advisors, and IT firms. Each snapshot asked Perplexity, with live web search, 20 questions buyers in that industry ask. That is 540 answers, and the sources each one cited.

The businesses' own websites were cited on 44 of the 540. Directories were cited on 307.

## Directories dominate the questions that matter most

The gap is widest on the question closest to a hire: who does this work near me.

| Question type | Answers | A directory cited | The business's own site cited |
|---|---|---|---|
| Who does this near me | 135 | 106 (79%) | 35 (26%) |
| Everything else | 405 | 201 (50%) | 9 (2%) |

The directories that came up most were the familiar ones. Across the 540 answers, Angi was cited on 83, Yellow Pages on 46, Houzz on 41, HomeGuide on 38, and HomeAdvisor and the Better Business Bureau on 34 each, with Yelp and Thumbtack close behind.

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

Twenty-seven businesses is a pattern, not a benchmark: one per industry, all based in New Jersey, one assistant, answers collected September 15 to 21, 2026. What counts as a directory follows each industry's own list, so a dentist's include Zocdoc and Healthgrades. The businesses aren't named and no single industry's numbers are shown. A [free snapshot](/) runs the same 20-question check on your own business, so you can see whether the pattern holds for you.
`,
}
