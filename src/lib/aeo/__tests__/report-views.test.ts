/** @jest-environment node */
import { isLikelyBot, isReportId } from '../report-views'

describe('isReportId', () => {
  it('accepts 24-character base64url IDs only', () => {
    expect(isReportId('3d5e879847cb79c62bdca761')).toBe(true)
    expect(isReportId('AbC-_0123456789abcdefGHIJ'.slice(0, 24))).toBe(true)
    for (const bad of ['short', `${'a'.repeat(24)}!`, 'a'.repeat(25), '', null, undefined, 42, ['x']]) {
      expect(isReportId(bad)).toBe(false)
    }
  })
})

describe('isLikelyBot', () => {
  it('passes ordinary browsers', () => {
    for (const ua of [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Safari/605.1.15',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',
    ]) {
      expect(isLikelyBot(ua)).toBe(false)
    }
  })

  it('flags crawlers, link previews, scanners, scripts, and missing agents', () => {
    for (const ua of [
      'Mozilla/5.0 (compatible; Googlebot/2.1)',
      'Slackbot-LinkExpanding 1.0',
      'Microsoft Office/16.0 (Link Preview)',
      'Barracuda Sentinel (EE) scanner',
      'curl/8.7.1',
      'python-requests/2.32',
      'Mozilla/5.0 HeadlessChrome/140.0',
      '',
      null,
    ]) {
      expect(isLikelyBot(ua)).toBe(true)
    }
  })
})
