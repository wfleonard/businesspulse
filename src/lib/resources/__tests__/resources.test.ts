/** @jest-environment node */
import { CANNED_PANELS } from '@/lib/aeo/panels'
import {
  ALL_ARTICLES,
  articleDate,
  findArticle,
  formatDay,
  parseHubFilters,
  publishedArticles,
  RESOURCE_TYPE_LABELS,
} from '..'
import { articleJsonLd, faqJsonLd, jsonLdString } from '../json-ld'

const panelSlugs = new Set(CANNED_PANELS.map((p) => p.slug))

describe.each(ALL_ARTICLES.map((a) => [a.slug, a] as const))('article %s', (_slug, article) => {
  it('has a URL-safe slug, a known type, and real dates', () => {
    expect(article.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    expect(Object.keys(RESOURCE_TYPE_LABELS)).toContain(article.type)
    expect(article.published).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(Number.isNaN(articleDate(article.published).getTime())).toBe(false)
    if (article.updated) expect(article.updated >= article.published).toBe(true)
  })

  it('names only industries that have a question set', () => {
    for (const industry of article.industries) expect(panelSlugs.has(industry)).toBe(true)
  })

  it('leads with a direct answer of reasonable length', () => {
    expect(article.summary.length).toBeGreaterThan(60)
    expect(article.summary.length).toBeLessThanOrEqual(320)
  })

  it('keeps the title as the only h1 and follows house style', () => {
    expect(article.body).not.toMatch(/^# /m)
    expect(article.body).toMatch(/^## /m)
    const text = `${article.title} ${article.summary} ${article.body}`
    expect(text).not.toContain('—')
    expect(text).not.toMatch(/\{[a-z_]+\}/)
  })

  it('repeats every FAQ question in the body', () => {
    for (const { q, a } of article.faq ?? []) {
      expect(a.trim()).not.toBe('')
      expect(article.body).toContain(q)
    }
  })
})

describe('article registry', () => {
  it('has unique slugs', () => {
    const slugs = ALL_ARTICLES.map((a) => a.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('hides drafts unless asked', () => {
    const draft = { ...ALL_ARTICLES[0], slug: 'draft-only', draft: true }
    ALL_ARTICLES.push(draft)
    try {
      expect(publishedArticles(false).some((a) => a.slug === 'draft-only')).toBe(false)
      expect(publishedArticles(true).some((a) => a.slug === 'draft-only')).toBe(true)
      expect(findArticle('draft-only', false)).toBeNull()
    } finally {
      ALL_ARTICLES.pop()
    }
  })

  it('sorts newest first', () => {
    const dates = publishedArticles(false).map((a) => a.updated ?? a.published)
    expect(dates).toEqual([...dates].sort().reverse())
  })

  it('formats dates in UTC', () => {
    expect(formatDay(articleDate('2026-09-18'))).toBe('September 18, 2026')
  })
})

describe('parseHubFilters', () => {
  it('keeps known types and industries', () => {
    expect(parseHubFilters({ type: 'guide', industry: 'commercial-roofing' })).toEqual({
      type: 'guide',
      industry: 'commercial-roofing',
    })
  })

  it('ignores unknown values', () => {
    expect(parseHubFilters({ type: 'podcast', industry: 'bakeries' })).toEqual({})
    expect(parseHubFilters({ type: ['benchmark', 'guide'] })).toEqual({ type: 'benchmark' })
  })
})

describe('structured data', () => {
  it('escapes anything that could close the script element', () => {
    const out = jsonLdString({ headline: '</script><script>alert(1)</script> & more' })
    expect(out).not.toContain('<')
    expect(out).not.toContain('>')
    expect(JSON.parse(out).headline).toBe('</script><script>alert(1)</script> & more')
  })

  it('builds an Article on the configured domain', () => {
    const saved = process.env.BETTER_AUTH_URL
    process.env.BETTER_AUTH_URL = 'https://businesspulse.app'
    try {
      const data = articleJsonLd({
        path: '/resources/what-is-aeo',
        title: 'What is AEO?',
        description: 'd',
        published: articleDate('2026-09-18'),
      })
      expect(data).toMatchObject({
        '@type': 'Article',
        url: 'https://businesspulse.app/resources/what-is-aeo',
        datePublished: '2026-09-18T00:00:00.000Z',
        dateModified: '2026-09-18T00:00:00.000Z',
        publisher: { name: 'BusinessPulse' },
      })
    } finally {
      process.env.BETTER_AUTH_URL = saved
    }
  })

  it('builds a FAQPage from question and answer pairs', () => {
    expect(faqJsonLd([{ q: 'Q?', a: 'A.' }])).toEqual({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [{ '@type': 'Question', name: 'Q?', acceptedAnswer: { '@type': 'Answer', text: 'A.' } }],
    })
  })
})
