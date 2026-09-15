import dns from 'dns'
import http from 'http'
import https from 'https'
import net from 'net'

/**
 * Fetch a visitor-supplied website without letting it reach our own network.
 *
 * - http and https only, on their standard ports; no credentials in the URL
 * - IP-literal hosts are refused outright
 * - hostnames are resolved inside the connection (the `lookup` hook), and the
 *   connection is refused if any resolved address is private, loopback,
 *   link-local, or otherwise non-public. The check runs at connect time, so a
 *   DNS answer that changes between check and connect (rebinding) can't slip by
 * - redirects are followed by hand, at most 3, and every hop is checked again
 * - 10-second deadline across all hops, 2 MB body cap, HTML only
 */

export class SiteFetchError extends Error {
  constructor(
    message: string,
    /** True when refused for safety rather than failing on its own. Not worth retrying over http. */
    readonly blocked = false
  ) {
    super(message)
    this.name = 'SiteFetchError'
  }
}

const BLOCKED = new net.BlockList()
for (const [network, prefix] of [
  ['0.0.0.0', 8], // "this" network
  ['10.0.0.0', 8], // private
  ['100.64.0.0', 10], // carrier-grade NAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local, including cloud metadata at 169.254.169.254
  ['172.16.0.0', 12], // private
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.0.2.0', 24], // documentation
  ['192.88.99.0', 24], // 6to4 relay
  ['192.168.0.0', 16], // private
  ['198.18.0.0', 15], // benchmarking
  ['198.51.100.0', 24], // documentation
  ['203.0.113.0', 24], // documentation
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved, including broadcast
] as const) {
  BLOCKED.addSubnet(network, prefix, 'ipv4')
}
// IPv4-mapped addresses (::ffff:a.b.c.d, dotted or hex) need no rule of their own:
// BlockList already checks them against the IPv4 rules above. Adding ::ffff:0:0/96
// here would instead block every IPv4 address.
for (const [network, prefix] of [
  ['::', 128], // unspecified
  ['::1', 128], // loopback
  ['64:ff9b::', 96], // NAT64
  ['100::', 64], // discard
  ['2001::', 32], // Teredo
  ['2001:db8::', 32], // documentation
  ['2002::', 16], // 6to4: embeds an IPv4 address
  ['fc00::', 7], // unique local
  ['fe80::', 10], // link-local
  ['ff00::', 8], // multicast
] as const) {
  BLOCKED.addSubnet(network, prefix, 'ipv6')
}

/** True for anything that isn't a public unicast address, including non-addresses. */
export function isBlockedAddress(address: string): boolean {
  const family = net.isIP(address)
  if (family === 4) return BLOCKED.check(address, 'ipv4')
  if (family === 6) return BLOCKED.check(address, 'ipv6')
  return true
}

export type Resolver = (
  hostname: string,
  callback: (err: NodeJS.ErrnoException | null, addresses: dns.LookupAddress[]) => void
) => void

const systemResolver: Resolver = (hostname, callback) =>
  dns.lookup(hostname, { all: true, verbatim: true }, callback)

type LookupCallback = (err: Error | null, address: string | dns.LookupAddress[], family?: number) => void

/**
 * A `lookup` for http(s).request that refuses hosts resolving to any non-public
 * address. A host with a mix of public and private addresses is refused too.
 */
export function guardedLookup(resolve: Resolver = systemResolver): net.LookupFunction {
  return (hostname, options, callback) => {
    const done = callback as unknown as LookupCallback
    const wanted = options.family === 'IPv4' ? 4 : options.family === 'IPv6' ? 6 : options.family || 0

    resolve(hostname, (err, addresses) => {
      if (err) return done(err, '', 0)
      const usable = addresses.filter((a) => !wanted || a.family === wanted)
      if (usable.length === 0) {
        return done(Object.assign(new Error(`no address found for ${hostname}`), { code: 'ENOTFOUND' }), '', 0)
      }
      if (usable.some((a) => isBlockedAddress(a.address))) {
        return done(new SiteFetchError(`${hostname} resolves to a non-public address`, true), '', 0)
      }
      if (options.all) return done(null, usable)
      done(null, usable[0].address, usable[0].family)
    })
  }
}

export type FetchOptions = {
  timeoutMs?: number
  maxBytes?: number
  maxRedirects?: number
  /** Tests only: replaces the guarded DNS lookup. */
  lookup?: net.LookupFunction
  /** Tests only: allow a non-standard port (a local test server). */
  anyPort?: boolean
}

export type FetchedPage = { url: string; html: string; truncated: boolean }

const USER_AGENT = 'BusinessPulseBot/1.0 (+https://businesspulse.app; AI visibility snapshot)'

/** Parse and vet a URL before connecting. Throws a blocked SiteFetchError when refused. */
export function checkUrl(value: string, options: { anyPort?: boolean } = {}): URL {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new SiteFetchError('invalid URL', true)
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new SiteFetchError(`${url.protocol} URLs are not fetched`, true)
  }
  if (url.username || url.password) throw new SiteFetchError('URLs with credentials are not fetched', true)
  const standardPort = url.protocol === 'https:' ? '443' : '80'
  if (url.port && url.port !== standardPort && !options.anyPort) {
    throw new SiteFetchError(`port ${url.port} is not fetched`, true)
  }
  if (net.isIP(url.hostname.replace(/^\[|\]$/g, ''))) {
    throw new SiteFetchError('IP address hosts are not fetched', true)
  }
  return url
}

type Hop = { redirect: string } | { body: string; truncated: boolean }

function requestOnce(url: URL, deadline: number, options: FetchOptions): Promise<Hop> {
  const maxBytes = options.maxBytes ?? 2 * 1024 * 1024

  return new Promise((resolve, reject) => {
    const remaining = deadline - Date.now()
    if (remaining <= 0) return reject(new SiteFetchError('timed out'))

    const client = url.protocol === 'https:' ? https : http
    const req = client.request(
      url,
      {
        method: 'GET',
        agent: false,
        lookup: options.lookup ?? guardedLookup(),
        headers: {
          'user-agent': USER_AGENT,
          accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1',
          'accept-encoding': 'identity',
        },
      },
      (res) => {
        const status = res.statusCode ?? 0
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume()
          return resolve({ redirect: res.headers.location })
        }
        if (status < 200 || status >= 300) {
          res.resume()
          return reject(new SiteFetchError(`HTTP ${status}`))
        }
        const type = String(res.headers['content-type'] ?? '')
        if (!/text\/html|application\/xhtml\+xml/i.test(type)) {
          res.resume()
          return reject(new SiteFetchError(`not an HTML page (${type || 'no content type'})`))
        }

        const chunks: Buffer[] = []
        let size = 0
        let truncated = false
        res.on('data', (chunk: Buffer) => {
          if (truncated) return
          if (size + chunk.length >= maxBytes) {
            chunks.push(chunk.subarray(0, maxBytes - size))
            truncated = true
            resolve({ body: Buffer.concat(chunks).toString('utf8'), truncated })
            req.destroy()
            return
          }
          chunks.push(chunk)
          size += chunk.length
        })
        res.on('end', () => {
          if (!truncated) resolve({ body: Buffer.concat(chunks).toString('utf8'), truncated: false })
        })
        res.on('error', (err) => reject(new SiteFetchError(err.message)))
      }
    )

    const timer = setTimeout(() => req.destroy(new SiteFetchError('timed out')), remaining)
    req.on('close', () => clearTimeout(timer))
    req.on('error', (err) => reject(err instanceof SiteFetchError ? err : new SiteFetchError(err.message)))
    req.end()
  })
}

/** Fetch one page, following and re-checking redirects. */
export async function fetchPage(startUrl: string, options: FetchOptions = {}): Promise<FetchedPage> {
  const deadline = Date.now() + (options.timeoutMs ?? 10_000)
  const maxRedirects = options.maxRedirects ?? 3
  let current = startUrl

  for (let hop = 0; ; hop++) {
    const url = checkUrl(current, options)
    const result = await requestOnce(url, deadline, options)
    if ('redirect' in result) {
      if (hop >= maxRedirects) throw new SiteFetchError('too many redirects')
      current = new URL(result.redirect, url).toString()
      continue
    }
    return { url: url.toString(), html: result.body, truncated: result.truncated }
  }
}

/** A business's homepage: https first, then http unless https was refused for safety. */
export async function fetchHomepage(domain: string, options: FetchOptions = {}): Promise<FetchedPage> {
  try {
    return await fetchPage(`https://${domain}/`, options)
  } catch (err) {
    if (err instanceof SiteFetchError && err.blocked) throw err
    return fetchPage(`http://${domain}/`, options)
  }
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  hellip: '…',
  copy: '©',
  reg: '®',
  trade: '™',
}

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code.startsWith('#')) {
      const value = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
      return Number.isFinite(value) && value > 0 && value <= 0x10ffff ? String.fromCodePoint(value) : match
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? match
  })
}

/**
 * Visible text of an HTML page for the question generator: title and meta
 * description first, then the body with scripts, styles and markup removed.
 */
export function extractText(html: string, maxChars = 8000): string {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
  const metaTag = html.match(/<meta\s[^>]*name\s*=\s*["']description["'][^>]*>/i)?.[0]
  const description = metaTag?.match(/content\s*=\s*(?:"([^"]*)"|'([^']*)')/i)
  const descriptionText = description ? (description[1] ?? description[2]) : undefined

  const body = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|template|iframe|head)\b[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<(?:br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/section|\/article|\/header|\/footer|\/nav)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')

  const lines: string[] = []
  for (const part of [title, descriptionText, body]) {
    if (!part) continue
    for (const raw of decodeEntities(part).split('\n')) {
      const line = raw.replace(/\s+/g, ' ').trim()
      if (line && line !== lines[lines.length - 1]) lines.push(line)
    }
  }

  return lines.join('\n').slice(0, maxChars)
}
