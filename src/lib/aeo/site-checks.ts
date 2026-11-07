import { normalizePageUrl, ownHosts, parseRobots, parseSitemap, robotsAllows } from './crawl'
import { extractText, fetchPage, SiteFetchError, type FetchOptions } from './site'

/**
 * Site checks for the Pulse report (docs/pulse-plan.md §4.4): a fixed list of
 * things that help AI assistants read and cite a site, read from the live
 * site. They describe what we found on these pages, never a site's search
 * ranking or overall health.
 */

export type CheckStatus = 'pass' | 'fix' | 'info'

export type SiteCheck = {
  id: string
  label: string
  status: CheckStatus
  /** What we found, in plain words. */
  detail: string
  /** Pages or agents the finding is about. */
  items: string[]
}

/** AI search crawlers: blocking these keeps a site out of the answers. */
export const AI_SEARCH_AGENTS = ['OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'Perplexity-User', 'Claude-SearchBot', 'Claude-User']
/** Training crawlers: blocking them doesn't stop citations, so it's noted, not flagged. */
export const AI_TRAINING_AGENTS = ['GPTBot', 'ClaudeBot', 'Google-Extended']

const TEXT_TYPES = /text\/plain|text\/markdown|text\/xml|application\/xml|application\/[a-z.+-]*xml|text\/html/i
const MAX_PAGES = 10
const THIN_TEXT_CHARS = 300

const BUSINESS_TYPES = /^(Organization|Corporation|LocalBusiness|OnlineStore|OnlineBusiness|Store|ProfessionalService|.*(Business|Contractor|Store|Service|Shop|Agency|Organization))$/

/** Every @type in a page's JSON-LD blocks, including nested ones and @graph entries. */
export function jsonLdTypes(html: string): string[] {
  const types = new Set<string>()
  const visit = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(visit)
    if (!node || typeof node !== 'object') return
    const record = node as Record<string, unknown>
    const type = record['@type']
    for (const t of Array.isArray(type) ? type : [type]) if (typeof t === 'string') types.add(t)
    for (const value of Object.values(record)) if (value && typeof value === 'object') visit(value)
  }
  for (const match of html.matchAll(/<script[^>]+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      visit(JSON.parse(match[1].trim()))
    } catch {
      // Malformed JSON-LD: AI crawlers can't read it either, so it counts as absent.
    }
  }
  return [...types]
}

export function hasMetaDescription(html: string): boolean {
  const tag = html.match(/<meta\s[^>]*name\s*=\s*["']description["'][^>]*>/i)?.[0]
  const content = tag?.match(/content\s*=\s*(?:"([^"]*)"|'([^']*)')/i)
  return Boolean((content?.[1] ?? content?.[2] ?? '').trim())
}

/** Which of these agents robots.txt keeps off the whole site. */
export function blockedAgents(robotsText: string | null, agents: readonly string[]): string[] {
  if (!robotsText) return []
  return agents.filter((agent) => !robotsAllows(parseRobots(robotsText, agent), '/'))
}

type Fetcher = (url: string, options?: FetchOptions) => Promise<{ url: string; html: string }>

export type SiteCheckInput = {
  domain: string
  otherDomains?: string[]
  /** Pages to check besides the homepage, usually the ones the brief was read from. */
  pageUrls: string[]
  /** Confirmed places, checked only for local and regional businesses. */
  places: string[]
  scope: string
  /** Sellers get the product check; service businesses the service one. */
  sellsProducts: boolean
}

export async function checkSite(input: SiteCheckInput, options: { fetch?: Fetcher } = {}): Promise<SiteCheck[]> {
  const get: Fetcher = options.fetch ?? fetchPage
  const hosts = ownHosts([input.domain, ...(input.otherDomains ?? [])])

  let home: { url: string; html: string }
  try {
    home = await get(`https://${input.domain}/`)
  } catch (err) {
    if (err instanceof SiteFetchError && err.blocked) throw err
    home = await get(`http://${input.domain}/`)
  }
  const origin = new URL(home.url).origin

  const text = async (path: string) => {
    try {
      return (await get(`${origin}${path}`, { contentTypes: TEXT_TYPES })).html
    } catch {
      return null
    }
  }
  const [robots, llms] = await Promise.all([text('/robots.txt'), text('/llms.txt')])

  let sitemapFound = false
  for (const url of robots ? parseRobots(robots).sitemaps.slice(0, 2) : []) {
    try {
      if (parseSitemap((await get(url, { contentTypes: TEXT_TYPES })).html).urls.length) sitemapFound = true
    } catch {
      // Listed but unreadable.
    }
  }
  if (!sitemapFound) {
    const fallback = await text('/sitemap.xml')
    sitemapFound = Boolean(fallback && parseSitemap(fallback).urls.length)
  }

  // The homepage plus the brief's pages, raw, for structured data and readable text.
  const urls = [...new Set(input.pageUrls.map((u) => normalizePageUrl(u, hosts)).filter((u): u is string => Boolean(u)))]
    .filter((u) => u !== normalizePageUrl(home.url, hosts))
    .slice(0, MAX_PAGES - 1)
  const pages = [home]
  for (const url of urls) {
    try {
      pages.push(await get(url))
    } catch {
      // Skipped: it's reported by what we could read.
    }
  }
  const pageInfo = pages.map((p) => ({ url: p.url, types: jsonLdTypes(p.html), text: extractText(p.html, 20_000) }))
  const allTypes = new Set(pageInfo.flatMap((p) => p.types))
  const path = (url: string) => new URL(url).pathname

  const checks: SiteCheck[] = []

  const blockedSearch = blockedAgents(robots, AI_SEARCH_AGENTS)
  const blockedTraining = blockedAgents(robots, AI_TRAINING_AGENTS)
  checks.push({
    id: 'ai-crawlers',
    label: 'AI assistants are allowed to read the site',
    status: blockedSearch.length ? 'fix' : 'pass',
    detail: blockedSearch.length
      ? `robots.txt blocks ${blockedSearch.join(', ')}, which fetch pages for AI answers.`
      : blockedTraining.length
        ? `AI search crawlers are allowed. robots.txt blocks ${blockedTraining.join(', ')}, which only collect training data, so citations aren't affected.`
        : robots
          ? 'robots.txt allows the crawlers ChatGPT, Claude, and Perplexity use to read pages.'
          : 'No robots.txt, so every crawler is allowed.',
    items: blockedSearch,
  })

  checks.push({
    id: 'sitemap',
    label: 'A sitemap lists the pages',
    status: sitemapFound ? 'pass' : 'fix',
    detail: sitemapFound ? 'A sitemap was found.' : 'No sitemap was found at /sitemap.xml or in robots.txt.',
    items: [],
  })

  const businessTypes = [...allTypes].filter((t) => BUSINESS_TYPES.test(t))
  checks.push({
    id: 'business-schema',
    label: 'Structured data says who the business is',
    status: businessTypes.length ? 'pass' : 'fix',
    detail: businessTypes.length
      ? `Found ${businessTypes.join(', ')} structured data.`
      : 'No Organization or LocalBusiness structured data (JSON-LD) on the pages checked.',
    items: [],
  })

  const faqPages = pageInfo.filter((p) => p.types.includes('FAQPage')).map((p) => path(p.url))
  checks.push({
    id: 'faq-schema',
    label: 'Question-and-answer pages are marked up as FAQs',
    status: faqPages.length ? 'pass' : 'fix',
    detail: faqPages.length ? `FAQPage structured data on ${faqPages.join(', ')}.` : 'No FAQPage structured data on the pages checked.',
    items: faqPages,
  })

  const offerType = input.sellsProducts ? 'Product' : 'Service'
  const offerPages = pageInfo.filter((p) => p.types.includes(offerType)).map((p) => path(p.url))
  checks.push({
    id: 'offer-schema',
    label: input.sellsProducts ? 'Products are marked up with prices' : 'Services are marked up',
    status: offerPages.length ? 'pass' : 'fix',
    detail: offerPages.length
      ? `${offerType} structured data on ${offerPages.slice(0, 5).join(', ')}.`
      : `No ${offerType} structured data on the pages checked.`,
    items: offerPages,
  })

  const thin = pageInfo.filter((p) => p.text.length < THIN_TEXT_CHARS).map((p) => path(p.url))
  checks.push({
    id: 'readable-text',
    label: 'Page text is readable without running scripts',
    status: thin.length ? 'fix' : 'pass',
    detail: thin.length
      ? `${thin.length} of ${pageInfo.length} pages have almost no text in their HTML, so AI crawlers that don't run scripts see little there.`
      : `All ${pageInfo.length} pages checked have their text in the HTML.`,
    items: thin,
  })

  if (input.scope === 'local' || input.scope === 'regional') {
    const siteText = pageInfo.map((p) => p.text.toLowerCase()).join('\n')
    const missing = input.places.filter((place) => !siteText.includes(place.split(',')[0].trim().toLowerCase()))
    checks.push({
      id: 'places-named',
      label: 'The towns you serve are named on the site',
      status: missing.length ? 'fix' : 'pass',
      detail: missing.length
        ? `${missing.length} of ${input.places.length} places you serve aren't named on the pages checked.`
        : 'Every place you serve is named on the site.',
      items: missing,
    })
  }

  checks.push({
    id: 'meta-description',
    label: 'The home page has a description',
    status: hasMetaDescription(home.html) ? 'pass' : 'fix',
    detail: hasMetaDescription(home.html) ? 'The home page has a meta description.' : 'The home page has no meta description.',
    items: [],
  })

  checks.push({
    id: 'llms-txt',
    label: 'An llms.txt file summarizes the site',
    status: llms && llms.trim().length > 50 ? 'pass' : 'info',
    detail:
      llms && llms.trim().length > 50
        ? 'llms.txt found.'
        : 'No llms.txt. It is optional and not every assistant reads it, but it is a cheap way to summarize the site.',
    items: [],
  })

  return checks
}
