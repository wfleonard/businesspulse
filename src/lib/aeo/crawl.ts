import { decodeEntities, extractText, fetchPage, SiteFetchError, type FetchOptions } from './site'

/**
 * The site deep dive (docs/business-panel-plan.md §3): read the pages that say
 * what a business does, so the brief is built from the whole site rather than
 * its homepage.
 *
 * Every request goes through fetchPage, which refuses private addresses and
 * re-checks redirects. Only the business's own hosts are read, robots.txt is
 * respected for our user agent, and the page count and text are capped.
 */

export const MAX_PAGES = 25
const PAGE_CHARS = 6000
const TOTAL_CHARS = 120_000
const MAX_CHILD_SITEMAPS = 3
const MAX_CANDIDATES = 400
const FETCH_CONCURRENCY = 4

export type CrawledPage = { url: string; title: string; text: string }

export type CrawlResult = {
  pages: CrawledPage[]
  /** Where page URLs came from. */
  source: 'sitemap' | 'links' | 'homepage'
  /** Pages we skipped or couldn't read, for the admin view. */
  skipped: { url: string; reason: string }[]
}

type Fetcher = (url: string, options?: FetchOptions) => Promise<{ url: string; html: string }>

const TEXT_TYPES = /text\/plain|text\/markdown|text\/xml|application\/xml|application\/[a-z.+-]*xml|text\/html/i

/** The hosts that count as the business's own site: the domain and its www form. */
export function ownHosts(domains: readonly string[]): Set<string> {
  const hosts = new Set<string>()
  for (const d of domains) {
    hosts.add(d)
    hosts.add(`www.${d}`)
  }
  return hosts
}

/* --------------------------- robots.txt --------------------------- */

export type RobotsRules = { allow: string[]; disallow: string[]; sitemaps: string[] }

/**
 * The rules that apply to one crawler (BusinessPulseBot unless named): a
 * group naming it if there is one, otherwise the `*` group. Sitemap lines
 * apply to everyone.
 */
export function parseRobots(text: string, agent = 'businesspulsebot'): RobotsRules {
  const token = agent.toLowerCase()
  type Group = { agents: string[]; allow: string[]; disallow: string[] }
  const groups: Group[] = []
  const sitemaps: string[] = []
  let current: Group | null = null
  let lastWasAgent = false

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim()
    const match = line.match(/^([a-z-]+)\s*:\s*(.*)$/i)
    if (!match) continue
    const field = match[1].toLowerCase()
    const value = match[2].trim()
    if (field === 'sitemap') {
      if (value) sitemaps.push(value)
      continue
    }
    if (field === 'user-agent') {
      if (!current || !lastWasAgent) {
        current = { agents: [], allow: [], disallow: [] }
        groups.push(current)
      }
      current.agents.push(value.toLowerCase())
      lastWasAgent = true
      continue
    }
    lastWasAgent = false
    if (!current) continue
    if (field === 'allow' && value) current.allow.push(value)
    if (field === 'disallow' && value) current.disallow.push(value)
  }

  const ours = groups.find((g) => g.agents.some((a) => a !== '*' && a === token))
  const any = groups.find((g) => g.agents.includes('*'))
  const group = ours ?? any
  return { allow: group?.allow ?? [], disallow: group?.disallow ?? [], sitemaps }
}

function ruleMatches(rule: string, path: string): number {
  // Supports the common `*` wildcard and `$` end anchor; returns the match length, or -1.
  const anchored = rule.endsWith('$')
  const body = anchored ? rule.slice(0, -1) : rule
  const pattern = body
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*')
  return new RegExp(`^${pattern}${anchored ? '$' : ''}`).test(path) ? body.length : -1
}

/** Longest matching rule wins; Allow wins a tie. */
export function robotsAllows(rules: Pick<RobotsRules, 'allow' | 'disallow'>, path: string): boolean {
  let best = -1
  let allowed = true
  for (const rule of rules.disallow) {
    const length = ruleMatches(rule, path)
    if (length > best) {
      best = length
      allowed = false
    }
  }
  for (const rule of rules.allow) {
    const length = ruleMatches(rule, path)
    if (length >= best && length >= 0) {
      best = length
      allowed = true
    }
  }
  return allowed
}

/* ----------------------------- URLs ------------------------------- */

/** <loc> entries of a sitemap, and whether it is a sitemap index. */
export function parseSitemap(xml: string): { urls: string[]; isIndex: boolean } {
  const urls = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => decodeEntities(m[1]))
  return { urls, isIndex: /<sitemapindex[\s>]/i.test(xml) }
}

/** Links on a page, resolved against it. */
export function extractLinks(html: string, base: string): string[] {
  const links: string[] = []
  for (const match of html.matchAll(/<a\s[^>]*href\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
    const href = decodeEntities(match[1] ?? match[2] ?? '').trim()
    if (!href || href.startsWith('#') || /^(mailto|tel|javascript):/i.test(href)) continue
    try {
      links.push(new URL(href, base).toString())
    } catch {
      // Unparseable href: skip.
    }
  }
  return links
}

/** A page URL on one of the business's hosts, without fragment or tracking query; null otherwise. */
export function normalizePageUrl(value: string, hosts: Set<string>): string | null {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  if (!hosts.has(url.hostname.toLowerCase())) return null
  if (/\.(pdf|jpe?g|png|gif|webp|svg|zip|mp4|mp3|docx?|xlsx?|css|js|xml|json)$/i.test(url.pathname)) return null
  url.hash = ''
  url.search = ''
  if (url.pathname !== '/' && url.pathname.endsWith('/')) url.pathname = url.pathname.slice(0, -1)
  return url.toString()
}

const STRONG = /(service|product|shop|store|offer|solution|what-we-do|capabilit|about|who-we-are|location|area|serv(e|ing)|region|faq|question|pric|cost|rate|quote|commercial|residential|industr|parish|school|diocese|church|business|government|municipal|wholesale|gift|catalog|portfolio|project|our-work|gallery|warrant|guarantee|certif|license|insur|financ|process|how-it-works|team)/i
const WEAK = /(blog|news|article|post|press|event|career|job)/i
const SKIP = /(cart|checkout|account|login|signin|sign-in|register|wp-admin|wp-json|feed|privacy|terms|cookie|policy|sitemap|search|tag\/|category\/|author\/|page\/\d|\?)/i

/** Higher is more worth reading. The homepage always comes first. */
export function scoreUrl(url: string): number {
  const { pathname } = new URL(url)
  if (pathname === '/' || pathname === '') return 1000
  if (SKIP.test(pathname)) return -1000
  const depth = pathname.split('/').filter(Boolean).length
  let score = 10 - depth * 2
  if (STRONG.test(pathname)) score += 20
  if (WEAK.test(pathname)) score -= 15
  return score
}

/** The pages to read: homepage first, then the best-scoring, at most `limit`. */
export function choosePages(candidates: readonly string[], limit = MAX_PAGES): string[] {
  const unique = [...new Set(candidates)]
  return unique
    .map((url, index) => ({ url, index, score: scoreUrl(url) }))
    .filter((c) => c.score > -1000)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map((c) => c.url)
}

/* ----------------------------- Crawl ------------------------------ */

function title(html: string): string {
  const raw = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ''
  return decodeEntities(raw).replace(/\s+/g, ' ').trim().slice(0, 200)
}

async function mapLimit<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const index = next++
        results[index] = await fn(items[index])
      }
    })
  )
  return results
}

export async function crawlSite(
  domain: string,
  otherDomains: readonly string[] = [],
  options: { fetch?: Fetcher; fetchOptions?: FetchOptions } = {}
): Promise<CrawlResult> {
  const get: Fetcher = options.fetch ?? fetchPage
  const base = options.fetchOptions ?? {}
  const hosts = ownHosts([domain, ...otherDomains])
  const skipped: CrawlResult['skipped'] = []

  // The homepage decides the scheme and host we use (https, www or not).
  let home: { url: string; html: string }
  try {
    home = await get(`https://${domain}/`, base)
  } catch (err) {
    if (err instanceof SiteFetchError && err.blocked) throw err
    home = await get(`http://${domain}/`, base)
  }
  const origin = new URL(home.url).origin
  if (!hosts.has(new URL(home.url).hostname)) {
    // Redirected off the business's own site: read only the homepage it landed on.
    return { pages: [{ url: home.url, title: title(home.html), text: extractText(home.html, PAGE_CHARS) }], source: 'homepage', skipped }
  }

  let robots: RobotsRules = { allow: [], disallow: [], sitemaps: [] }
  try {
    robots = parseRobots((await get(`${origin}/robots.txt`, { ...base, contentTypes: TEXT_TYPES })).html)
  } catch {
    // No robots.txt: everything is allowed.
  }

  // Candidate URLs: the sitemap if there is one, else the homepage's links.
  const candidates: string[] = []
  let source: CrawlResult['source'] = 'homepage'
  const sitemapUrls = robots.sitemaps.length ? robots.sitemaps.slice(0, 2) : [`${origin}/sitemap.xml`]
  for (const sitemapUrl of sitemapUrls) {
    try {
      const map = parseSitemap((await get(sitemapUrl, { ...base, contentTypes: TEXT_TYPES })).html)
      const urls = map.isIndex
        ? (
            await mapLimit(map.urls.slice(0, MAX_CHILD_SITEMAPS), 2, async (child) => {
              try {
                return parseSitemap((await get(child, { ...base, contentTypes: TEXT_TYPES })).html).urls
              } catch {
                return []
              }
            })
          ).flat()
        : map.urls
      candidates.push(...urls)
    } catch {
      // No sitemap at that address.
    }
  }
  if (candidates.length) source = 'sitemap'
  const fromLinks = extractLinks(home.html, home.url)
  if (!candidates.length && fromLinks.length) source = 'links'
  // Homepage links are added either way: menus often name pages a stale sitemap misses.
  candidates.push(...fromLinks)

  const allowed: string[] = [home.url]
  for (const candidate of candidates.slice(0, MAX_CANDIDATES * 4)) {
    const url = normalizePageUrl(candidate, hosts)
    if (!url) continue
    if (!robotsAllows(robots, new URL(url).pathname)) {
      skipped.push({ url, reason: 'robots.txt' })
      continue
    }
    allowed.push(url)
    if (allowed.length >= MAX_CANDIDATES) break
  }

  const chosen = choosePages(allowed).filter((url) => url !== home.url)
  const pages: CrawledPage[] = [{ url: home.url, title: title(home.html), text: extractText(home.html, PAGE_CHARS) }]
  const fetched = await mapLimit(chosen.slice(0, MAX_PAGES - 1), FETCH_CONCURRENCY, async (url) => {
    try {
      const page = await get(url, base)
      return { url: page.url, title: title(page.html), text: extractText(page.html, PAGE_CHARS) }
    } catch (err) {
      skipped.push({ url, reason: err instanceof Error ? err.message : String(err) })
      return null
    }
  })

  let total = pages[0].text.length
  const seenText = new Set([pages[0].text])
  for (const page of fetched) {
    if (!page || !page.text || seenText.has(page.text)) continue
    if (total + page.text.length > TOTAL_CHARS) break
    seenText.add(page.text)
    total += page.text.length
    pages.push(page)
  }

  return { pages, source, skipped: skipped.slice(0, 50) }
}
