import type { ResourceArticle } from '../types'

export const howToGetCited: ResourceArticle = {
  slug: 'how-to-get-cited-by-ai-search',
  type: 'guide',
  title: 'How to get your business cited by AI search',
  summary:
    'Answer the exact questions your buyers ask, on pages AI assistants can read, and make your business easy to verify across the web. Most of it is plain, specific writing and a few technical settings.',
  industries: [],
  published: '2026-09-18',
  body: `
## 1. Find the questions you're missing

Start with the questions buyers actually ask: who does this near me, what does it cost, do I need a permit, which option is better. A [free snapshot](/) asks 20 of them for your industry and area and shows which ones cite your site. In our snapshots so far, businesses that show up at all tend to show up on "who does this near me" questions, and rarely on cost, permits, or how-it-works questions, which is where a buyer decides who to trust.

## 2. Write a page for each question you should own

- Use the buyer's question, in their words, as the heading.
- Answer it directly in the first two sentences. Assistants quote pages that get to the point.
- Then add what only you know: real price ranges and what moves them, how long the work takes, which permits your towns require, what goes wrong and how you handle it.
- One question per page, or one clear section per question on a longer page.

## 3. Let AI search engines read your site

- **Allow their crawlers.** Your site's robots.txt file should let in the crawlers that fetch pages for answers, including OAI-SearchBot and ChatGPT-User (OpenAI), PerplexityBot and Perplexity-User, and Claude-SearchBot and Claude-User (Anthropic). Blocking them makes it impossible to be cited.
- **Put the words in the page.** Answers locked in images, PDFs, or text that only appears after scripts run are harder to read and quote.
- **Keep it fast and working on phones.** The same basics that help search engines help here.

## 4. Add structured data

Structured data is a short block of code that tells search engines, in a standard format, who you are and what you do.

- **Organization or LocalBusiness:** your name, address, phone number, service area, and logo.
- **Service:** each service you offer and where.
- **FAQPage:** on pages that genuinely answer a list of questions.

Give your business one stable identifier and reuse it everywhere, so every page points to the same business.

## 5. Make your business easy to verify

Assistants trust what they can confirm in several places.

- Complete your Google Business Profile.
- Use exactly the same business name, address, and phone number on every directory and listing.
- List your licenses, certifications, and trade association memberships on your site, and get listed in those associations' directories.
- Link your site to your official profiles, and those profiles back to your site.

## 6. Check again

New and changed pages take weeks to be found and trusted. Run another snapshot after a month or two and compare question by question, since the same business always gets the same questions.

## What doesn't work

- **Hundreds of near-identical pages,** such as one templated page per town. Search engines treat unoriginal pages published at scale as spam.
- **Bought links.** Assistants weigh consistent, verifiable presence over link counts.
- **Keyword stuffing and hidden text.** A page written for a machine reads badly to the buyer the answer sends to it.
`,
}
