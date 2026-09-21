import { CANNED_PANELS } from '@/lib/aeo/panels'
import { costQuestionsCiteCostGuides } from './articles/cost-questions-cite-cost-guides'
import { howBusinessPulseMeasures } from './articles/how-businesspulse-measures'
import { howToCheckChatGpt } from './articles/how-to-check-chatgpt-recommends'
import { howToGetCited } from './articles/how-to-get-cited'
import { whatIsAeo } from './articles/what-is-aeo'
import { whyAiCitesDirectories } from './articles/why-ai-cites-directories'
import { RESOURCE_TYPE_LABELS, type ResourceArticle, type ResourceType } from './types'

export { RESOURCE_TYPE_LABELS, type ResourceArticle, type ResourceType }

/**
 * Written Resource Hub pages. They live in code rather than loose Markdown
 * files because the production image ships compiled code only.
 */
export const ALL_ARTICLES: ResourceArticle[] = [
  howBusinessPulseMeasures,
  whatIsAeo,
  howToGetCited,
  whyAiCitesDirectories,
  costQuestionsCiteCostGuides,
  howToCheckChatGpt,
]

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

/** Published articles, newest first. Drafts are included outside production. */
export function publishedArticles(includeDrafts: boolean = !isProduction()): ResourceArticle[] {
  return ALL_ARTICLES.filter((a) => includeDrafts || !a.draft).sort((a, b) =>
    (b.updated ?? b.published).localeCompare(a.updated ?? a.published)
  )
}

export function findArticle(slug: string, includeDrafts: boolean = !isProduction()): ResourceArticle | null {
  return publishedArticles(includeDrafts).find((a) => a.slug === slug) ?? null
}

/** "2026-09-18" as a UTC date, so it renders the same day everywhere. */
export function articleDate(day: string): Date {
  return new Date(`${day}T00:00:00Z`)
}

export function formatDay(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' }).format(date)
}

export function industryName(slug: string): string | null {
  return CANNED_PANELS.find((p) => p.slug === slug)?.name ?? null
}

export type HubFilters = { type?: ResourceType; industry?: string }

/** Unknown values are ignored, so a bad link just shows everything. */
export function parseHubFilters(params: Record<string, string | string[] | undefined>): HubFilters {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim()
  const filters: HubFilters = {}
  const type = first(params.type)
  if (type && type in RESOURCE_TYPE_LABELS) filters.type = type as ResourceType
  const industry = first(params.industry)
  if (industry && CANNED_PANELS.some((p) => p.slug === industry)) filters.industry = industry
  return filters
}
