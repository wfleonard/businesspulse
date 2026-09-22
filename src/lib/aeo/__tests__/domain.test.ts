/** @jest-environment node */
import { coversOtherDomains, normalizeDomain } from '../domain'

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

describe('coversOtherDomains', () => {
  it('reuses a run only when it already credits every site the request lists', () => {
    expect(coversOtherDomains([], [])).toBe(true)
    expect(coversOtherDomains(['guzziroofing.com'], [])).toBe(true)
    expect(coversOtherDomains(['guzziroofing.com', 'b.com'], ['guzziroofing.com'])).toBe(true)
    // The case that found this: the old run said "cited on 0 of 20" because it
    // didn't credit the second site. Reusing it would hand that report back.
    expect(coversOtherDomains([], ['guzziroofing.com'])).toBe(false)
    expect(coversOtherDomains(['b.com'], ['guzziroofing.com', 'b.com'])).toBe(false)
  })
})
