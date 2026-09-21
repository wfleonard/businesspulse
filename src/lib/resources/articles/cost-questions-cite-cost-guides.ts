import type { ResourceArticle } from '../types'

export const costQuestionsCiteCostGuides: ResourceArticle = {
  slug: 'ai-search-cost-questions-cite-cost-guides',
  type: 'explainer',
  title: 'When buyers ask AI what a job costs, it cites cost guides, not contractors',
  summary:
    'Ask an AI assistant what a job costs and it quotes national cost guides such as HomeGuide and Angi. In our snapshots, the businesses’ own sites were cited on none of 22 cost answers. That gap is an opening.',
  industries: [],
  published: '2026-09-21',
  body: `
## The pattern

In September 2026 we ran seven BusinessPulse snapshots, one business in each of seven industries, 20 buyer questions each, asked of Perplexity with live web search. Twenty-two of those questions were about cost: what a job costs, what it costs per foot or per square foot, what drives the price.

The businesses' own websites were cited on none of the 22.

The same few sites answered them instead:

| Site | Cost answers citing it (of 22) |
|---|---|
| HomeGuide | 14 |
| Angi | 13 |
| Fixr | 8 |
| Bob Vila | 7 |
| Thumbtack | 6 |
| HomeAdvisor | 6 |

Across the 22 answers, 240 different websites were cited in all, and not one of them was the business we were measuring.

## It isn't only cost

Cost is the clearest case of a wider pattern. Of the 140 questions, the businesses were cited on 11, and every one of those was a "who does this near me" or "who is buying" question. On the other 91, about cost, permits, comparisons, specific jobs, problems, how the work is done, and choosing a provider, they were cited on none.

We saw the same shape earlier, measured more deeply. In August 2026 we asked ChatGPT, Claude, and Perplexity 116 buyer questions about one directional drilling contractor: 348 answers. The contractor was cited on 10 questions, all of them requests for a list of companies. On 36 cost answers and 42 permit answers, it was cited on none.

## Why cost guides win

We can see what gets cited, not why, so this is our reading of it.

- **They publish numbers.** A cost guide leads with a price range and what moves it. A contractor site that says only "call for a free estimate" leaves an assistant nothing to quote.
- **They answer the question as asked.** "How much does a heat pump cost to install" is a heading on a cost guide. It often appears nowhere on an installer's site.
- **They are built for it.** Cost guide publishers write thousands of these pages. A small business writes none.

## Why that's an opening

A national cost guide is an average across the country. You know what the job actually costs in your area, what makes one job cost twice another, and what buyers get wrong when they compare quotes. That is more useful to the buyer than the guide, and nobody else can publish it.

It also matters where these questions sit. A buyer asking about cost is deciding whether and how to go ahead, and the source that answers is the one they trust next. Right now that is a cost guide, often one that sells the lead on to whoever pays.

## How to write a cost page an assistant can cite

- **Use the buyer's question as the heading,** in their words: "How much does it cost to replace a commercial flat roof?"
- **Give a range in the first two sentences,** with a date. You don't have to publish a quote; a typical range and what puts a job at the top or bottom of it is enough.
- **Explain what moves the price** with specifics only you have: access, soil, permits, materials, season, the job size where your pricing changes.
- **Say where the range applies:** the towns or region you work in.
- **Keep it current.** Update the range and the date when your prices change, so the page stays the most recent answer.

One good page per question you want to own beats a single page trying to answer every price question at once.

## What this sample can and can't tell you

Seven businesses and 22 cost answers is a pattern, not a benchmark: one assistant, answers collected September 15 to 18, 2026, and no business or single industry is shown. A [free snapshot](/) asks your buyers' questions for your area, cost questions included for the seven industries above, so you can see who answers them.
`,
}
