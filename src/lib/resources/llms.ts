import { appUrl } from '@/lib/aeo/emails'
import { SITE_DESCRIPTION } from './json-ld'
import type { ResourceArticle } from './types'

/**
 * /llms.txt (llmstxt.org): a plain Markdown map of the site for AI assistants,
 * built from the same published pages as the sitemap. Drafts never appear.
 */
export function buildLlmsTxt(
  articles: Pick<ResourceArticle, 'slug' | 'title' | 'summary'>[],
  benchmarks: { slug: string; name: string }[]
): string {
  const lines = [
    '# BusinessPulse',
    '',
    `> ${SITE_DESCRIPTION}`,
    '',
    'BusinessPulse measures AI search visibility for small and midsize businesses. A snapshot asks Perplexity buyer questions drawn from a question set for the business’s industry, filled in with its service and town, and reports which answers cite the business’s website, whether the business is named, and which sites are cited instead (directories, reference sites, and competitors). It is free and needs no account.',
    '',
    'A Pulse report goes further: in a free account, BusinessPulse reads the business’s website, writes the questions its buyers ask about what it actually sells (the owner confirms what was found, and Saxon reviews the questions), and asks them of ChatGPT, Claude, Perplexity, and Gemini. The report shows every answer, the sites cited instead, checks of the site, and a prioritized list of what to fix. It costs $100 per report, plus New Jersey sales tax for New Jersey buyers, with no subscription and at most one report every 30 days. Saxon will make the fixes in a report for $500, one time, after confirming the scope.',
    '',
    'BusinessPulse is run by Saxon AEO (Saxon Enterprises, Inc., Tinton Falls, New Jersey), which also offers answer engine optimization as a service: Saxon AEO Core is $1,500 a month on a six-month term, and its full audit is included when you book a call.',
    '',
    '## Start here',
    '',
    `- [Free AI visibility snapshot](${appUrl('/')}): request a snapshot for any business website`,
    `- [Pulse](${appUrl('/pulse')}): the full report on four AI assistants, with what to fix, $100 per report`,
    `- [Resources](${appUrl('/resources')}): guides, industry benchmarks, and our method`,
  ]

  if (articles.length > 0) {
    lines.push('', '## Guides', '')
    for (const a of articles) lines.push(`- [${a.title}](${appUrl(`/resources/${a.slug}`)}): ${a.summary}`)
  }

  if (benchmarks.length > 0) {
    lines.push('', '## Industry benchmarks', '')
    for (const b of benchmarks) {
      lines.push(`- [${b.name}](${appUrl(`/resources/benchmarks/${b.slug}`)}): how often AI search cites businesses in this industry`)
    }
  }

  lines.push('', '## Optional', '', `- [Privacy](${appUrl('/privacy')})`, '')
  return lines.join('\n')
}
