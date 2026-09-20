import type { ResourceArticle } from '../types'

export const howBusinessPulseMeasures: ResourceArticle = {
  slug: 'how-businesspulse-measures-ai-visibility',
  type: 'method',
  title: 'How the BusinessPulse snapshot measures AI visibility',
  summary:
    'We ask Perplexity, with live web search, 20 questions that buyers in your industry and area actually ask, then check which websites each answer cites. Your score is the number of questions where your own site was one of them.',
  industries: [],
  published: '2026-09-18',
  updated: '2026-09-20',
  body: `
## Which questions we ask

For seven industries we keep a prepared question set of 64 to 104 buyer questions: directional drilling and trenchless utilities, commercial roofing, electrical contracting, HVAC and plumbing, landscaping and lawn care, pools and hot tubs, and municipal advisors. Each question has placeholders for your service, city, and state, so "who installs heat pumps near Red Bank, New Jersey" is asked the way a buyer in your area would type it.

For your snapshot we fill in those placeholders and pick 20 questions. Every snapshot includes questions about hiring locally, about cost, and about permits or regulation where the set has them, with the rest spread across comparisons, how-it-works questions, specific jobs, choosing a provider, and common problems. The same business always gets the same 20 questions, so a later snapshot is a fair comparison with an earlier one.

For any other kind of business, we read your homepage and write 20 questions for it. Those are less precise than a prepared set, and the report says so.

## How we ask them

Each question goes to Perplexity's Sonar model with live web search, one question at a time, with no history from earlier questions. We keep the full answer and every source it cites.

## What counts as cited

| Result | Meaning |
|---|---|
| Your site cited | Your domain, or a subdomain of it, is one of the answer's sources. This is the goal. |
| Named, not linked | The answer names your business, but your site isn't a source. |
| Only through a directory | You're named, and the only route to you is a listing site such as Yelp or Angi. |
| Not mentioned | The answer searched the web and you weren't in it. |
| Answered from memory | The assistant answered without searching. |

A question the assistant fails to answer isn't counted either way; the report says how many that affected.

"Answered from memory" is held apart from the rest on purpose. An assistant decides question by question whether to search, and when it doesn't, its answer describes what it absorbed during training rather than what is findable about you now. Counting that as a miss would pad the number with questions nobody actually measured, so those questions are set aside and reported separately, and every rate we quote is out of the questions that were searched. Being named in one of those answers still counts as named: recall without a lookup is a real signal, and a strong one.

## Who gets cited instead

The report lists the websites cited in your place. Government sites, reference sites, trade press, and equipment makers aren't counted as competitors: each prepared question set carries its own list of those, so a building code or a manufacturer's spec sheet doesn't show up as a rival.

## What a snapshot can't tell you

- **It's one assistant.** ChatGPT, Claude, and Gemini often cite different sources for the same question. The full audit asks all three.
- **It's a point in time.** AI answers change as the models and the web change, so treat a snapshot as a reading, not a ranking.
- **It's a sample.** Twenty questions show a pattern; they don't cover every way a buyer might ask.
- **It doesn't cover Google's AI Overviews.** Google publishes no way for a tool to ask AI Overviews a question and read the answer, so no measurement tool covers it, ours included.
- **It shows what assistants answer, not why.** No assistant explains why it chose one source over another, so a snapshot tells you where you stand, and the work that follows is informed judgment rather than a formula.

## Industry benchmarks

Our industry benchmarks combine snapshots into one picture per industry. They never name a business, and an industry's benchmark is published only once at least 10 businesses in it have been measured.
`,
}
