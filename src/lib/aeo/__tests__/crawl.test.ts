/** @jest-environment node */
import {
  choosePages,
  crawlSite,
  extractLinks,
  normalizePageUrl,
  ownHosts,
  parseRobots,
  parseSitemap,
  robotsAllows,
  scoreUrl,
} from '../crawl'
import { SiteFetchError } from '../site'

describe('robots.txt', () => {
  const robots = parseRobots(`
User-agent: *
Disallow: /private
Allow: /private/press
Disallow: /*.pdf$

User-agent: GPTBot
Disallow: /

Sitemap: https://acme.com/sitemap.xml
`)

  it('uses the * group when no group names us, and collects sitemaps', () => {
    expect(robots.disallow).toEqual(['/private', '/*.pdf$'])
    expect(robots.sitemaps).toEqual(['https://acme.com/sitemap.xml'])
  })

  it('applies the longest matching rule, Allow winning a tie', () => {
    expect(robotsAllows(robots, '/services')).toBe(true)
    expect(robotsAllows(robots, '/private/notes')).toBe(false)
    expect(robotsAllows(robots, '/private/press/2026')).toBe(true)
    expect(robotsAllows(robots, '/files/menu.pdf')).toBe(false)
  })

  it('prefers a group that names BusinessPulseBot', () => {
    const ours = parseRobots('User-agent: *\nDisallow:\n\nUser-agent: BusinessPulseBot\nDisallow: /')
    expect(robotsAllows(ours, '/anything')).toBe(false)
  })
})

describe('finding pages', () => {
  const hosts = ownHosts(['acme.com'])

  it('reads sitemaps and sitemap indexes', () => {
    expect(parseSitemap('<urlset><url><loc> https://acme.com/a </loc></url></urlset>')).toEqual({
      urls: ['https://acme.com/a'],
      isIndex: false,
    })
    expect(parseSitemap('<sitemapindex><sitemap><loc>https://acme.com/s1.xml</loc></sitemap></sitemapindex>').isIndex).toBe(true)
  })

  it('keeps only page URLs on the business own hosts', () => {
    expect(normalizePageUrl('https://www.acme.com/services/?utm=x#top', hosts)).toBe('https://www.acme.com/services')
    expect(normalizePageUrl('https://evil.com/acme.com', hosts)).toBeNull()
    expect(normalizePageUrl('https://acme.com/brochure.pdf', hosts)).toBeNull()
    expect(normalizePageUrl('ftp://acme.com/x', hosts)).toBeNull()
  })

  it('resolves links and skips mailto, tel, and fragments', () => {
    const html = '<a href="/about">About</a><a href="mailto:a@b.com">x</a><a href="#top">t</a><a href=\'services\'>s</a>'
    expect(extractLinks(html, 'https://acme.com/home/')).toEqual(['https://acme.com/about', 'https://acme.com/home/services'])
  })

  it('reads the homepage first, then pages about what the business does', () => {
    const urls = [
      'https://acme.com/blog/2024/05/our-picnic',
      'https://acme.com/cart',
      'https://acme.com/services/roof-repair',
      'https://acme.com/',
      'https://acme.com/about',
      'https://acme.com/privacy-policy',
    ]
    expect(choosePages(urls, 3)).toEqual(['https://acme.com/', 'https://acme.com/about', 'https://acme.com/services/roof-repair'])
    expect(scoreUrl('https://acme.com/cart')).toBe(-1000)
  })
})

describe('crawlSite', () => {
  const pages: Record<string, string> = {
    'https://acme.com/': '<title>Acme Roofing</title><a href="/services">Services</a><a href="https://other.com/">x</a>',
    'https://acme.com/robots.txt': 'User-agent: *\nDisallow: /members',
    'https://acme.com/sitemap.xml':
      '<urlset><url><loc>https://acme.com/about</loc></url><url><loc>https://acme.com/members/area</loc></url></urlset>',
    'https://acme.com/about': '<title>About</title><p>Family roofers since 1990.</p>',
    'https://acme.com/services': '<title>Services</title><p>Roof repair and replacement.</p>',
  }
  const requested: string[] = []
  const fetch = async (url: string) => {
    requested.push(url)
    if (!(url in pages)) throw new SiteFetchError('HTTP 404')
    return { url, html: pages[url] }
  }

  it('reads sitemap pages and homepage links on the same site, honoring robots.txt', async () => {
    const result = await crawlSite('acme.com', [], { fetch })
    expect(result.source).toBe('sitemap')
    expect(result.pages.map((p) => p.url)).toEqual(['https://acme.com/', 'https://acme.com/about', 'https://acme.com/services'])
    expect(result.pages[1].text).toContain('Family roofers since 1990.')
    expect(result.skipped).toContainEqual({ url: 'https://acme.com/members/area', reason: 'robots.txt' })
    expect(requested.some((u) => u.includes('other.com'))).toBe(false)
  })

  it('refuses a site that resolves to a private address', async () => {
    const blocked = async () => {
      throw new SiteFetchError('resolves to a non-public address', true)
    }
    await expect(crawlSite('acme.com', [], { fetch: blocked })).rejects.toThrow('non-public')
  })
})
