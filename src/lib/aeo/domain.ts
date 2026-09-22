const IPV4 = /^\d{1,3}(?:\.\d{1,3}){3}$/
const LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/
const TLD = /^(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/

/**
 * Normalize a visitor-typed website to a bare host: lowercase, no scheme, port,
 * path, or leading "www.". Returns '' when the input isn't a public domain.
 *
 * For every domain both accept, the output matches Job::normalizeDomain in
 * panel/src/Job.php, so the database and the worker's job file agree. This
 * version is stricter because it guards a public form: http(s) only, no
 * credentials, no IP addresses, valid DNS labels. Internationalized names come
 * back in their ASCII (xn--) form.
 */
export function normalizeDomain(input: string): string {
  const value = input.trim().toLowerCase()
  if (value === '' || value.length > 2048) return ''

  let url: URL
  try {
    url = new URL(value.includes('://') ? value : `http://${value}`)
  } catch {
    return ''
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return ''
  if (url.username || url.password) return ''

  const host = url.hostname.replace(/\.$/, '').replace(/^www\./, '')
  if (host.length > 253 || !host.includes('.') || IPV4.test(host)) return ''

  const labels = host.split('.')
  if (!labels.every((label) => LABEL.test(label))) return ''
  if (!TLD.test(labels[labels.length - 1])) return ''

  return host
}

/**
 * Whether an existing run can stand in for a new request: it must already
 * credit every other site the request lists. A run that credits more sites is
 * fine; one that credits fewer would hand back a report that counted some of
 * the business's own citations as a competitor's.
 */
export function coversOtherDomains(runOtherDomains: readonly string[], requested: readonly string[]): boolean {
  return requested.every((domain) => runOtherDomains.includes(domain))
}
