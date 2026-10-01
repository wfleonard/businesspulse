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
    'BusinessPulse is run by Saxon AEO (Saxon Enterprises Inc, Tinton Falls, New Jersey), which offers full audits across ChatGPT, Claude, Perplexity, and Gemini, and answer engine optimization for businesses.',
    '',
    '## Start here',
    '',
    `- [Free AI visibility snapshot](${appUrl('/')}): request a snapshot for any business website`,
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
