/** Page types in the Resource Hub. Benchmarks are generated from snapshot data; the rest are written. */
export const RESOURCE_TYPE_LABELS = {
  benchmark: 'Industry benchmark',
  guide: 'Guide',
  explainer: 'Explainer',
  method: 'Method',
  answer: 'Short answer',
} as const

export type ResourceType = keyof typeof RESOURCE_TYPE_LABELS

export type ResourceArticle = {
  /** URL segment under /resources. */
  slug: string
  type: Exclude<ResourceType, 'benchmark'>
  title: string
  /** The direct answer in one or two sentences. Shown under the title and used as the meta description. */
  summary: string
  /** Canned panel slugs this page is written for, or [] for every industry. */
  industries: string[]
  /** YYYY-MM-DD */
  published: string
  /** YYYY-MM-DD, when the content last changed meaningfully. */
  updated?: string
  /** Drafts show in development only. */
  draft?: boolean
  /** Markdown. Start sections at ## (the title is the page's only h1). */
  body: string
  /** Questions answered in the body, repeated here for FAQPage structured data. */
  faq?: { q: string; a: string }[]
}
