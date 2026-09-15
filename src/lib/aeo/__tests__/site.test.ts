/** @jest-environment node */
import http from 'http'
import type { AddressInfo } from 'net'
import type net from 'net'
import {
  checkUrl,
  decodeEntities,
  extractText,
  fetchPage,
  guardedLookup,
  isBlockedAddress,
  SiteFetchError,
  type Resolver,
} from '../site'

describe('isBlockedAddress', () => {
  it.each([
    '127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254',
    '100.64.0.1', '0.0.0.0', '224.0.0.1', '255.255.255.255', '::1', '::', 'fe80::1', 'fd00::1',
    '::ffff:127.0.0.1', '::ffff:7f00:1', '2002:c0a8:0101::1', 'not-an-ip', '',
  ])('blocks %s', (address) => {
    expect(isBlockedAddress(address)).toBe(true)
  })

  it.each(['8.8.8.8', '69.164.219.143', '172.32.0.1', '2606:4700:4700::1111', '::ffff:8.8.8.8'])('allows %s', (address) => {
    expect(isBlockedAddress(address)).toBe(false)
  })
})

describe('checkUrl', () => {
  it.each([
    'ftp://example.com/',
    'file:///etc/passwd',
    'https://example.com:8443/',
    'http://127.0.0.1/',
    'http://[::1]/',
    'http://169.254.169.254/latest/meta-data/',
    'https://user:pass@example.com/',
    'not a url',
  ])('refuses %s', (url) => {
    expect(() => checkUrl(url)).toThrow(SiteFetchError)
  })

  it('accepts standard http and https URLs', () => {
    expect(checkUrl('https://example.com/').hostname).toBe('example.com')
    expect(checkUrl('http://example.com:80/about').pathname).toBe('/about')
  })
})

describe('guardedLookup', () => {
  const lookupWith = (addresses: { address: string; family: number }[], options: Record<string, unknown> = {}) =>
    new Promise<{ err: Error | null; address: unknown; family?: number }>((resolve) => {
      const resolver: Resolver = (_host, cb) => cb(null, addresses)
      const lookup = guardedLookup(resolver)
      ;(lookup as unknown as (h: string, o: object, cb: (...args: unknown[]) => void) => void)(
        'example.com',
        options,
        (err, address, family) => resolve({ err: err as Error | null, address, family: family as number | undefined })
      )
    })

  it('passes a public address through', async () => {
    await expect(lookupWith([{ address: '93.184.216.34', family: 4 }])).resolves.toEqual({
      err: null,
      address: '93.184.216.34',
      family: 4,
    })
  })

  it('returns every address when asked for all', async () => {
    const addresses = [
      { address: '93.184.216.34', family: 4 },
      { address: '2606:2800:220:1::1', family: 6 },
    ]
    expect((await lookupWith(addresses, { all: true })).address).toEqual(addresses)
  })

  it('refuses a private address, and a mix of public and private', async () => {
    for (const addresses of [
      [{ address: '10.0.0.5', family: 4 }],
      [{ address: '93.184.216.34', family: 4 }, { address: '127.0.0.1', family: 4 }],
    ]) {
      const { err } = await lookupWith(addresses)
      expect(err).toBeInstanceOf(SiteFetchError)
      expect((err as SiteFetchError).blocked).toBe(true)
    }
  })
})

describe('fetchPage', () => {
  let server: http.Server
  let base: string
  const loopback = ((_host: string, options: { all?: boolean }, cb: (...args: unknown[]) => void) =>
    options.all ? cb(null, [{ address: '127.0.0.1', family: 4 }]) : cb(null, '127.0.0.1', 4)) as unknown as net.LookupFunction
  const local = { lookup: loopback, anyPort: true }

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      const port = (server.address() as AddressInfo).port
      const html = (body: string) => {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
        res.end(body)
      }
      const redirect = (location: string) => {
        res.writeHead(302, { location })
        res.end()
      }
      switch (req.url) {
        case '/': return html('<title>Home</title><p>Hello</p>')
        case '/r1': return redirect('/r2')
        case '/r2': return redirect('/')
        case '/loop': return redirect('/loop')
        case '/to-ip': return redirect(`http://127.0.0.1:${port}/`)
        case '/json':
          res.writeHead(200, { 'content-type': 'application/json' })
          return res.end('{}')
        case '/big': return html('x'.repeat(50_000))
        case '/slow': return // never responds
        default:
          res.writeHead(404, { 'content-type': 'text/html' })
          return res.end('missing')
      }
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    base = `http://test.example:${(server.address() as AddressInfo).port}`
  })

  afterAll(async () => {
    server.closeAllConnections()
    await new Promise((resolve) => server.close(resolve))
  })

  it('refuses a host that resolves to loopback with the default guard', async () => {
    const error = await fetchPage(`${base}/`, { anyPort: true }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(SiteFetchError)
  })

  it('refuses when the guard sees a private address', async () => {
    const resolver: Resolver = (_host, cb) => cb(null, [{ address: '127.0.0.1', family: 4 }])
    const error = await fetchPage(`${base}/`, { anyPort: true, lookup: guardedLookup(resolver) }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(SiteFetchError)
    expect((error as SiteFetchError).blocked).toBe(true)
  })

  it('fetches HTML and follows redirects', async () => {
    const page = await fetchPage(`${base}/r1`, local)
    expect(page.html).toContain('<title>Home</title>')
    expect(page.url).toBe(`${base}/`)
    expect(page.truncated).toBe(false)
  })

  it('re-checks every redirect hop', async () => {
    await expect(fetchPage(`${base}/to-ip`, local)).rejects.toThrow('IP address hosts are not fetched')
  })

  it('stops after three redirects', async () => {
    await expect(fetchPage(`${base}/loop`, local)).rejects.toThrow('too many redirects')
  })

  it('refuses non-HTML and error responses', async () => {
    await expect(fetchPage(`${base}/json`, local)).rejects.toThrow('not an HTML page')
    await expect(fetchPage(`${base}/missing`, local)).rejects.toThrow('HTTP 404')
  })

  it('caps the body size', async () => {
    const page = await fetchPage(`${base}/big`, { ...local, maxBytes: 1000 })
    expect(page.html).toHaveLength(1000)
    expect(page.truncated).toBe(true)
  })

  it('gives up at the deadline', async () => {
    await expect(fetchPage(`${base}/slow`, { ...local, timeoutMs: 300 })).rejects.toThrow('timed out')
  })
})

describe('extractText', () => {
  it('puts title and description first and drops scripts, styles and markup', () => {
    const html = `<!doctype html><html><head><title>Acme &amp; Sons | Drilling</title>
      <meta content="Tom's crew bores under roads." name="description">
      <style>.x{color:red}</style><script>alert("no")</script></head>
      <body><nav><a href="/">Home</a></nav><!-- hidden --><h1>Directional drilling</h1>
      <p>Serving&nbsp;New Jersey since 1998&#8212;call us.</p><svg><text>logo</text></svg></body></html>`
    expect(extractText(html)).toBe(
      "Acme & Sons | Drilling\nTom's crew bores under roads.\nHome\nDirectional drilling\nServing New Jersey since 1998—call us."
    )
  })

  it('caps the length', () => {
    expect(extractText(`<p>${'word '.repeat(5000)}</p>`, 100)).toHaveLength(100)
  })
})

describe('decodeEntities', () => {
  it('decodes named, decimal and hex entities and leaves unknown ones', () => {
    expect(decodeEntities('&lt;a&gt; &#39;x&#x27; &rsquo; &bogus;')).toBe("<a> 'x' ’ &bogus;")
  })
})
