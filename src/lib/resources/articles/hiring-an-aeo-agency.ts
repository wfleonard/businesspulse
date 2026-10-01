import type { ResourceArticle } from '../types'

const faq = [
  {
    q: 'What should I look for when hiring an AEO agency?',
    a: 'Look for an agency that measures before it works and shows you the baseline, tracks the questions your buyers actually ask across more than one AI assistant, shows which sites are cited instead of you, writes pages that stay yours, and sets targets without guaranteeing results.',
  },
  {
    q: 'What questions should I ask an AEO agency before signing?',
    a: 'Ask which questions they will track and who chose them, which assistants they check, what your baseline is today, what they will publish each month, who owns the pages if you leave, how long the term is, and what results their other clients saw, measured the same way.',
  },
  {
    q: 'How can I tell if an AEO agency is actually getting results?',
    a: 'Compare each month’s measurement with the baseline taken before the work started, on the same questions asked the same way. Results are citations of your own site on more questions, especially cost, permit, and comparison questions, and eventually inquiries that trace back to AI search. Activity reports, page counts, and traffic charts without a baseline are not results.',
  },
  {
    q: 'What are the red flags when buying AI search optimization services?',
    a: 'Guaranteed citations or rankings in ChatGPT, claims to measure Google’s AI Overviews precisely, dozens of cheap backlinks or directory submissions a month, no baseline before work starts, reports that show only one assistant, and pages that stay on the agency’s site or vanish when you leave.',
  },
  {
    q: 'Should an AEO report show which sites were cited instead of mine?',
    a: 'Yes. The list of sites cited instead tells you what kind of page wins each question, whether a cost guide, a directory, a forum thread, or a competitor, and so what you need to publish. A report that only says whether you were cited leaves out the most useful part.',
  },
]

export const hiringAnAeoAgency: ResourceArticle = {
  slug: 'how-to-hire-an-aeo-agency',
  type: 'guide',
  title: 'How to hire an AEO agency: what to look for, what to ask, and the red flags',
  summary:
    'Hire an AEO agency that measures your AI search visibility before it starts, tracks real buyer questions across several assistants, shows who is cited instead of you, and leaves the pages with you. Be wary of guarantees, cheap link packages, and reports with no baseline.',
  industries: ['ai-visibility'],
  published: '2026-10-01',
  draft: true,
  body: `
## What should I look for when hiring an AEO agency?

Answer engine optimization is new enough that anyone can say they do it. The difference between an agency that gets results and one that doesn't usually shows up before you sign, in how they measure.

A good AEO agency:

- **Measures first.** It asks the questions your buyers ask, records which answers cite your site, and shows you that baseline before doing any work. Everything after is judged against it.
- **Tracks buyer questions, not keywords.** Buyers ask assistants about cost, permits, comparisons, and problems, not only "who does this near me." A useful set covers all of them, usually 50 to 100 or more questions for one business.
- **Checks more than one assistant.** ChatGPT, Perplexity, Claude, and Gemini cite different sources for the same question. A report on one of them is a partial picture.
- **Shows who is cited instead of you.** That list decides what to publish (see below).
- **Writes pages you own.** The pages live on your website, under your name, and stay there if you leave.
- **Sets targets, not guarantees.** No one controls what an assistant cites. An honest agency tells you what it expects and when, and shows you the numbers either way.

## What questions should I ask an AEO agency before signing?

| Ask | A good answer |
|---|---|
| Which questions will you track, and who chose them? | A list you can read, built for your industry and area, that you can add to |
| Which AI assistants do you check? | Several, named, with the same questions asked of each |
| What is my baseline today? | A number per question type, measured before the work starts |
| What will you publish each month? | Specific pages tied to specific questions you're losing |
| Who owns the pages and the data if I leave? | You do |
| How long is the term, and what happens at the end? | A fixed term, with a re-measurement on the same questions |
| What did other clients see, measured the same way? | Before-and-after numbers on their own baselines, not screenshots of one good answer |
| When should I expect inquiries? | Months, not weeks, said plainly |

If an agency can't show you a baseline before you sign, ask for one. A short snapshot costs very little to run, so an agency that won't measure first is asking you to pay before either of you knows where you stand.

## How can I tell if an AEO agency is actually getting results?

Results are measured on the same questions, asked the same way, as the baseline. Look for:

- **Your own site cited on more questions,** not just named in the text. Being named with only a directory cited means the directory owns the route to you.
- **Wins outside "near me" questions.** Local businesses are often cited on list questions already. In September 2026 we measured 27 businesses on 540 buyer questions: their own sites were cited on 44, all of them "who does this near me" or "who is buying" questions, and on none of the cost, permit, comparison, or problem questions. Progress on those is the real test.
- **The same questions, re-run on a schedule.** AI answers change from day to day. A single good answer proves little; a pattern across months does.
- **Eventually, inquiries.** Customers who say they found you through ChatGPT or Perplexity, or visits from those assistants in your analytics. Expect these around month three or four, not in the first weeks.

Activity is not a result. A report that lists pages published, hours worked, or a traffic chart with no baseline tells you the agency was busy, not that AI search cites you more.

## What are the red flags when buying AI search optimization services?

- **Guaranteed citations or "rank #1 in ChatGPT."** No one can guarantee what an assistant cites.
- **Precise claims about Google's AI Overviews.** Google publishes no way for a tool to ask AI Overviews a question and read the answer, so treat exact AI Overview numbers carefully.
- **Link packages.** Real editorial mentions cost $100 to $500 each. Anyone selling 10 to 40 a month at small-business prices is selling directory submissions, which do little for AI search.
- **No baseline.** Work that starts before anything is measured can't be shown to have changed anything.
- **One assistant only,** or a report built from screenshots of hand-picked answers.
- **Pages that aren't yours.** Content published on the agency's own site or a network of their sites, or taken down when you stop paying.
- **Vague deliverables.** "AI optimization" with no list of pages, questions, or fixes.

## Should an AEO report show which sites were cited instead of mine?

Yes, and it may be the most useful part of the report. For each question you lose, the sites cited instead show what kind of page wins it:

- **A cost guide** wins most cost questions. You need a page with real price ranges for your area.
- **A directory** such as Yelp or Angi means assistants found the listing, not you. Your own site needs to answer the question, and your listings need to match it.
- **A Reddit or forum thread** means no business answered the question well. That one is open to whoever publishes first.
- **A competitor** shows you exactly what page to beat.

A report that only says "cited" or "not cited" leaves you guessing about what to do next. [How BusinessPulse measures AI visibility](/resources/how-businesspulse-measures-ai-visibility) shows how we report this.

## What it should cost

Small-business AEO retainers are commonly quoted at $1,500 to $5,000 a month, and self-serve tracking tools run up to about $500 a month. Most of what an agency charges for is writing, so ask what you get per month in pages. Our [guide to what AEO costs](/resources/how-much-does-aeo-cost) has the full breakdown, including what Saxon AEO charges.

## Check before you call

Before you talk to any agency, run a [free BusinessPulse snapshot](/). It asks 20 of your buyers' questions and shows which answers cite your site and who was cited instead, so you go into the first call knowing your own baseline and can judge what each agency tells you.
`,
  faq,
}
