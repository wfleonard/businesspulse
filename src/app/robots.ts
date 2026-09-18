import type { MetadataRoute } from 'next'
import { appUrl } from '@/lib/aeo/emails'

// Built per request so the sitemap URL comes from BETTER_AUTH_URL at runtime.
export const dynamic = 'force-dynamic'

/** Private-by-link or signed-in pages. Reports and /book also send noindex headers. */
export const PRIVATE_PATHS = ['/dashboard', '/login', '/api/', '/check/', '/report/', '/book']

/**
 * AI search assistants fetch pages live when they answer, and can only cite
 * what they're allowed to fetch. They're named explicitly so a later broad
 * rule can't shut them out by accident.
 */
export const AI_RETRIEVAL_BOTS = [
  'OAI-SearchBot',
  'ChatGPT-User',
  'PerplexityBot',
  'Perplexity-User',
  'Claude-SearchBot',
  'Claude-User',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: AI_RETRIEVAL_BOTS, allow: '/', disallow: PRIVATE_PATHS },
      { userAgent: '*', allow: '/', disallow: PRIVATE_PATHS },
    ],
    sitemap: appUrl('/sitemap.xml'),
  }
}
