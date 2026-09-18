import type { MetadataRoute } from 'next'
import { appUrl } from '@/lib/aeo/emails'
import { articleDate, publishedArticles } from '@/lib/resources'
import { benchmarkAvailability } from '@/lib/resources/benchmarks'

// Built per request: URLs come from BETTER_AUTH_URL at runtime, and benchmarks
// appear as soon as an industry has enough snapshots.
export const dynamic = 'force-dynamic'

/**
 * Public pages only. Reports, verification links, the dashboard, and the API
 * stay out (see robots.ts). Drafts are never listed.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: appUrl('/'), changeFrequency: 'weekly', priority: 1 },
    { url: appUrl('/resources'), changeFrequency: 'weekly', priority: 0.8 },
    ...publishedArticles(false).map((article) => ({
      url: appUrl(`/resources/${article.slug}`),
      lastModified: articleDate(article.updated ?? article.published),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    { url: appUrl('/privacy'), lastModified: new Date('2026-09-18'), changeFrequency: 'yearly', priority: 0.3 },
  ]

  // The sitemap must still work if the database doesn't.
  try {
    for (const benchmark of await benchmarkAvailability()) {
      if (!benchmark.available) continue
      entries.push({
        url: appUrl(`/resources/benchmarks/${benchmark.slug}`),
        lastModified: benchmark.lastMeasured ?? undefined,
        changeFrequency: 'weekly',
        priority: 0.8,
      })
    }
  } catch (err) {
    console.error('sitemap: benchmarks unavailable:', err)
  }

  return entries
}
