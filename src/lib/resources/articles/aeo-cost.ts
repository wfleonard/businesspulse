import type { ResourceArticle } from '../types'

const faq = [
  {
    q: 'How much does answer engine optimization cost?',
    a: 'Self-serve AI visibility tools run from free to about $500 a month. Small-business agency retainers are commonly quoted at $1,500 to $5,000 a month, and a one-time audit sold on its own at $1,500 to $5,000. The price mostly follows how many questions are tracked, how many AI assistants are checked, and whether anyone writes pages for you.',
  },
  {
    q: 'Is there a free way to check if ChatGPT or Perplexity cites my business?',
    a: 'Yes. You can ask an assistant your buyers’ questions yourself and read the sources under each answer, or run a free BusinessPulse snapshot, which asks Perplexity 20 buyer questions for your industry and reports which answers cite your site and who was cited instead.',
  },
  {
    q: 'Is a tracking tool enough, or do I need an agency?',
    a: 'A tool tells you where you stand. It does not write the pages that change the answer. If you or your team can write a clear page for each question buyers ask, a tool may be all you need. If not, the cost of the work is the writing, not the measuring.',
  },
  {
    q: 'What do BusinessPulse and Saxon AEO charge?',
    a: 'A BusinessPulse snapshot is free. Saxon AEO retainers are $1,500 a month on a six-month term. A small number of founding clients pay $1,000 a month plus $500 onboarding. The full audit is included when you book a call.',
  },
  {
    q: 'How long before AEO pays off?',
    a: 'Expect the first measurable change in citations within a few months of new pages going live, and the first inquiries that come from AI search around month three or four. Anyone guaranteeing citations or a timeline is promising something no one controls.',
  },
]

export const aeoCost: ResourceArticle = {
  slug: 'how-much-does-aeo-cost',
  type: 'guide',
  title: 'How much does AEO cost? Prices for tools, audits, and agencies',
  summary:
    'Answer engine optimization costs from nothing to about $500 a month for self-serve tracking tools, and $1,500 to $5,000 a month for most small-business agency retainers. BusinessPulse snapshots are free; Saxon AEO retainers are $1,500 a month.',
  industries: ['ai-visibility'],
  published: '2026-10-01',
  body: `
## How much does answer engine optimization cost?

Prices as of October 2026. Agency and audit ranges are the ones most commonly quoted to small businesses, not a survey.

| Option | Typical price | What you get |
|---|---|---|
| Check by hand | Free | Ask an assistant your buyers' questions and read the sources |
| Free snapshot | Free | A one-time check on a fixed set of questions |
| Self-serve tracking tool | $29 to about $500 a month | Repeated checks on the questions you choose |
| One-time audit | $1,500 to $5,000 | A deeper measurement and a list of what to fix |
| Agency retainer | $1,500 to $5,000 a month | Measurement plus the pages and fixes that change it |
| Enterprise platform | $1,000 a month and up | Many brands, many markets, team features |

The spread is wide because these are different products. A tracking tool measures. An agency measures and then does the work. Most of what you pay an agency for is writing.

## Is there a free way to check if ChatGPT or Perplexity cites my business?

Yes, two. Ask an assistant the questions your buyers ask and read the sources listed under each answer; do it in a private window so your own history doesn't color the result. Or run a [free BusinessPulse snapshot](/), which asks Perplexity 20 buyer questions for your industry and shows which answers cite your site and which sites were cited instead.

Either way, you get a one-time picture. Paying starts to make sense when you want the same questions re-asked on a schedule, across several assistants, or want someone to do the work that changes the answers.

## Tracking tools

Self-serve tools ask AI assistants a list of questions on a schedule and report whether your site was cited. Entry prices in October 2026:

| Tool | Entry plan |
|---|---|
| Otterly.AI | $29 a month for 15 questions |
| Peec AI | About $95 a month for 50 questions, billed monthly |
| Profound | $99 a month, billed yearly, ChatGPT only |

What raises the price:

- **Number of questions.** Entry plans track 15 to 50. A useful picture of one business takes 50 to 100 or more, because buyers ask about cost, permits, comparisons, and problems, not only "who does this near me."
- **Number of assistants.** ChatGPT, Perplexity, Gemini, Claude, and Google's AI Overviews are often priced as separate add-ons.
- **Number of brands or locations.** Agencies and multi-location businesses pay per project.

Check which questions a tool asks. A tool that tracks only questions you thought of will miss the ones you didn't.

## One-time audits

An audit asks a large set of buyer questions across several assistants, once, and reports where you're cited, where you aren't, and who is cited instead. It is the baseline every later result is measured against.

Sold on its own, an audit is commonly quoted at $1,500 to $5,000. Many agencies include it free as the first step of an engagement, since the audit is what sets the scope and the price.

Before paying for one, ask:

- **How many questions, and which assistants?** Twenty questions on one assistant is a snapshot. A full audit is closer to a hundred, on three or four.
- **Does it show who was cited instead?** That list tells you what kind of page wins each question: a cost guide, a directory, a forum thread, a competitor.
- **Do you keep the data?** The baseline is only useful if it can be re-run the same way later.

## Agency retainers

A retainer pays for the work that changes the answers: pages written to answer specific buyer questions, structured data, fixes to how your site can be read, listings that confirm who you are, and a monthly re-measurement.

For small businesses, retainers are commonly quoted at $1,500 to $5,000 a month, usually on a three- to twelve-month term. What moves the price:

- **How many pages a month.** One well-researched page that answers a cost or permit question is worth more than ten thin ones, and costs more to write.
- **Locations and service lines.** Each one has its own set of questions.
- **Who owns the work.** Ask whether the pages stay on your site if you leave. They should.

## Is a tracking tool enough, or do I need an agency?

A tool tells you where you stand. It doesn't write the pages that change the answer. If you or someone on your team can write a clear page for each buyer question you're losing, a $29 to $200 tool and your own time may be all you need. If no one has that time, the cost of AEO is the writing, not the measuring, and that is what a retainer pays for.

## What do BusinessPulse and Saxon AEO charge?

BusinessPulse is the measurement tool. Saxon AEO is the service that does the work, using the same measurement.

| | Price | What's included |
|---|---|---|
| BusinessPulse snapshot | Free | 20 buyer questions for your industry, asked of Perplexity, with the sites cited instead |
| Saxon AEO full audit | Included when you book a call | More than 100 buyer questions across ChatGPT, Claude, Perplexity, and Gemini, and a plan to get your site cited |
| Saxon AEO Core | $1,500 a month, six-month term | Researched pages, technical fixes, and a monthly re-measurement against your baseline |
| Founding clients | $1,000 a month, six-month term, plus $500 onboarding | Core, for a small number of clients who agree to a testimonial and to sharing their results |

Before you commit, we fix the technical foundation for free: structured data, robots and sitemap, and the homepage changes that make your site easier to read and cite. It is the first measurable change against your baseline.

The pages we write are yours. If you leave, they stay on your site and keep working.

## How long before AEO pays off?

It depends on what a customer is worth to you. For a business where one job is worth several thousand dollars, a retainer pays for itself with a few jobs a year. For a business with small tickets, a free snapshot and pages you write yourself may be the right size.

Set expectations honestly either way. New pages can be cited within weeks, but the first inquiries that trace back to AI search tend to arrive around month three or four. Targets are reasonable; guarantees aren't, because no one controls what an assistant cites.

## If you'd rather do it yourself

You can. The method is not a secret:

1. **Measure first.** Run a free snapshot or ask the questions by hand, and note who is cited instead.
2. **Write one page per question you lose,** with the buyer's question as the heading and the direct answer in the first two sentences.
3. **Publish specifics only you have:** prices, timelines, service areas, and what makes one job cost more than another.
4. **Re-measure** a month or two later, on the same questions.

[How to get cited by AI search](/resources/how-to-get-cited-by-ai-search) walks through the page side in detail.
`,
  faq,
}
