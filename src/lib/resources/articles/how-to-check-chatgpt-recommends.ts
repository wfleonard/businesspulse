import type { ResourceArticle } from '../types'

const faq = [
  {
    q: 'Why does ChatGPT give a different answer each time I ask?',
    a: 'AI assistants search the web fresh for many questions and write a new answer each time, so the businesses and sources can change from one ask to the next, and from week to week as the web changes. That is why one check proves little: ask the same questions the same way on a schedule, and compare the pattern rather than a single answer.',
  },
  {
    q: 'Is being named in the answer the same as being recommended?',
    a: 'Not quite. Being named in the text is good, but check the sources too. If your own website is one of them, the assistant found and trusted your site. If you are named but only a directory such as Yelp or Angi is cited, the directory is doing the recommending, and it owns the route to you.',
  },
]

export const howToCheckChatGpt: ResourceArticle = {
  slug: 'how-to-check-if-chatgpt-recommends-your-business',
  type: 'guide',
  title: 'How to check whether ChatGPT recommends your business',
  summary:
    'Ask ChatGPT, Perplexity, and Claude the questions your buyers ask, in a fresh chat, naming your town, then read the sources under each answer, not just the text. Repeat on a schedule, because answers change.',
  industries: [],
  published: '2026-09-21',
  faq,
  body: `
## 1. Write down the questions your buyers ask

Ten to twenty is enough. Write them the way a customer would type them, with your town or county in each one, and spread them across the kinds of questions buyers actually ask:

- **Who does it near me:** "Who installs commercial flat roofs near Allentown, PA?"
- **Cost:** "How much does a flat roof replacement cost per square foot?"
- **Permits or rules:** "Do I need a permit to replace a roof in Lehigh County?"
- **Comparisons:** "TPO or EPDM for a warehouse roof?"
- **Problems:** "Why is my flat roof leaking after heavy rain?"
- **Choosing a provider:** "What should I ask a roofing contractor before hiring?"

Don't only check the first kind. In our snapshots, the businesses we measured were cited on 8 of 35 "near me" questions and on none of 91 questions about cost, permits, comparisons, problems, how the work is done, and choosing a provider. Those are the questions where buyers decide who to trust.

## 2. Ask in a clean session

- **Start a fresh chat for each question,** so earlier questions don't steer the answer.
- **Turn off memory or use a temporary chat** where the assistant offers one, so what it knows about you doesn't color the result.
- **Name the place in the question** rather than relying on the assistant to guess your location.

## 3. Read the sources, not just the answer

Below or beside each answer is a list of the pages it drew on. That list is the result that matters. In our snapshots, each answer cited about 18 sources, so look through all of them.

For each question, record one of four outcomes:

| Outcome | What it means |
|---|---|
| Your site is a source | The assistant found and trusted your website. This is the goal. |
| Named, but not a source | It knows your name, but it isn't getting it from your site. |
| Only through a directory | You're reached through Yelp, Angi, or similar. The directory owns the lead. |
| Not there | The assistant searched and you weren't in it. |

## 4. Ask more than one assistant

Assistants disagree, often sharply. In August 2026 we asked ChatGPT, Claude, and Perplexity the same 116 questions about one contractor. ChatGPT cited the contractor's site on 10 answers, Perplexity on 3, and Claude on none. Checking one assistant tells you about that assistant.

Perplexity, ChatGPT, and Claude all show their sources when they search the web. Your buyers may be using any of them.

## 5. Write it down and do it again

Keep the list of questions and your results in a spreadsheet, with the date. Ask the same questions again in a month. A single answer is noise; the same question going from "not there" to "your site is a source" is the signal that your changes worked.

## Or let us run it

A [free BusinessPulse snapshot](/) does steps 1 to 3 for you: 20 buyer questions for your industry and area, asked of Perplexity with live web search, with every answer and its sources in the report. The same business always gets the same questions, so a later snapshot is a fair comparison. [How the snapshot measures](/resources/how-businesspulse-measures-ai-visibility) explains the method and its limits.

## Why does ChatGPT give a different answer each time I ask?

${faq[0].a}

## Is being named in the answer the same as being recommended?

${faq[1].a}
`,
}
