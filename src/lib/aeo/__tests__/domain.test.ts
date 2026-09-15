/** @jest-environment node */
import { normalizeDomain } from '../domain'

describe('normalizeDomain', () => {
  it.each([
    ['Example.com', 'example.com'],
    ['  example.com  ', 'example.com'],
    ['https://www.EastCoastUtility.com/about?x=1#top', 'eastcoastutility.com'],
    ['http://example.com:8080/path', 'example.com'],
    ['www.example.com.', 'example.com'],
    ['shop.example.co.uk', 'shop.example.co.uk'],
    ['my-company.com', 'my-company.com'],
    ['bücher.de', 'xn--bcher-kva.de'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeDomain(input)).toBe(expected)
  })

  it.each([
    [''],
    ['   '],
    ['localhost'],
    ['http://localhost:3000'],
    ['127.0.0.1'],
    ['http://10.0.0.5/admin'],
    ['0x7f.0.0.1'],
    ['http://[::1]/'],
    ['ftp://example.com'],
    ['javascript:alert(1)'],
    ['user@example.com'],
    ['http://user:pass@example.com'],
    ['exa mple.com'],
    ['-bad.com'],
    ['bad-.com'],
    ['example.123'],
    ['www.'],
    [`${'a'.repeat(64)}.com`],
  ])('rejects %s', (input) => {
    expect(normalizeDomain(input)).toBe('')
  })
})
