import type { ResourceArticle } from '../types'

const faq = [
  {
    q: 'How is AEO different from SEO?',
    a: 'SEO aims for a high position in a list of search results. AEO aims to be one of the few sources an AI assistant cites in its answer, because the buyer may read that answer and never see a list of links at all.',
  },
  {
    q: 'Why does AEO matter for a local business?',
    a: 'Buyers now ask assistants who to hire, what a job costs, and whether they need a permit. The answer names a handful of businesses and sources. If yours isn’t one of them, you’re invisible for that question, however well your site ranks on Google.',
  },
  {
    q: 'How do AI assistants decide what to cite?',
    a: 'Assistants that search the web read the pages their search returns and cite the ones that answer the question directly and look trustworthy. Pages that answer one question clearly, with specifics such as prices, timelines, and service areas, are easier to cite.',
  },
  {
    q: 'How can I tell whether AI search cites my business?',
    a: 'Ask an assistant the questions your buyers ask and look at the sources under each answer, or run a free BusinessPulse snapshot, which asks 20 of them and reports which ones cite your site.',
  },
]

export const whatIsAeo: ResourceArticle = {
  slug: 'what-is-aeo',
  type: 'answer',
  title: 'What is AEO (answer engine optimization)?',
  summary:
    'AEO is the work of getting your business cited when people ask AI assistants like ChatGPT, Perplexity, and Claude for recommendations. Where SEO aims for a ranking on a results page, AEO aims to be one of the few sources an assistant quotes in its answer.',
  industries: [],
  published: '2026-09-18',
  faq,
  body: faq.map(({ q, a }) => `## ${q}\n\n${a}\n`).join('\n'),
}
