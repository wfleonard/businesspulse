import type { MetadataRoute } from 'next'
import { appUrl } from '@/lib/aeo/emails'

// Built per request so URLs come from BETTER_AUTH_URL at runtime, not the build.
export const dynamic = 'force-dynamic'

/**
 * Public pages only. Reports, verification links, the dashboard, and the API
 * stay out (see robots.ts). Add /resources pages here when the hub ships.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: appUrl('/'), changeFrequency: 'weekly', priority: 1 },
    { url: appUrl('/privacy'), lastModified: new Date('2026-09-15'), changeFrequency: 'yearly', priority: 0.3 },
  ]
}
