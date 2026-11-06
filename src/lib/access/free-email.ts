/**
 * Accounts are for businesses, so sign-up needs a company email address.
 * This blocks the free mail providers and the common throwaway inboxes.
 */

/** Providers blocked under any country ending: yahoo.com, yahoo.co.uk, hotmail.fr, gmx.de. */
const FREE_FAMILIES = new Set([
  'aol',
  'gmail',
  'gmx',
  'googlemail',
  'hotmail',
  'live',
  'mail',
  'msn',
  'outlook',
  'rocketmail',
  'yahoo',
  'yandex',
  'ymail',
])

/** Country endings a free family may use; a company subdomain like outlook.acme.com never matches. */
const COUNTRY_ENDING = /^(com|net|org|[a-z]{2}|co\.[a-z]{2}|com\.[a-z]{2})$/

/** Exact domains: other free providers and disposable inboxes. */
const FREE_DOMAINS = new Set([
  // Free providers
  'att.net',
  'bellsouth.net',
  'btinternet.com',
  'charter.net',
  'comcast.net',
  'cox.net',
  'earthlink.net',
  'email.com',
  'fastmail.com',
  'fastmail.fm',
  'frontier.com',
  'hey.com',
  'hushmail.com',
  'icloud.com',
  'inbox.com',
  'juno.com',
  'lycos.com',
  'mac.com',
  'mail.ru',
  'me.com',
  'netzero.net',
  'optonline.net',
  'optimum.net',
  'passmail.net',
  'pm.me',
  'proton.me',
  'protonmail.ch',
  'protonmail.com',
  'qq.com',
  'rediffmail.com',
  'rogers.com',
  'sbcglobal.net',
  'shaw.ca',
  'sky.com',
  'spectrum.net',
  'tutanota.com',
  'tuta.io',
  'verizon.net',
  'web.de',
  'windstream.net',
  'zoho.com',
  'zohomail.com',
  '163.com',
  '126.com',
  // Disposable inboxes
  '10minutemail.com',
  'discard.email',
  'dispostable.com',
  'emailondeck.com',
  'fakeinbox.com',
  'getnada.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'mailinator.com',
  'maildrop.cc',
  'mailnesia.com',
  'mintemail.com',
  'mohmal.com',
  'sharklasers.com',
  'temp-mail.org',
  'tempmail.com',
  'tempmail.net',
  'throwawaymail.com',
  'trashmail.com',
  'yopmail.com',
])

export const COMPANY_EMAIL_MESSAGE =
  'Please use your company email address. Personal addresses like Gmail, Yahoo, or Outlook can’t be used for a BusinessPulse account.'

/** True when the address is at a free or throwaway mail provider. */
export function isFreeEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split('@').pop()?.replace(/\.$/, '') ?? ''
  if (!domain) return false
  if (FREE_DOMAINS.has(domain)) return true
  const [first, ...rest] = domain.split('.')
  return FREE_FAMILIES.has(first) && COUNTRY_ENDING.test(rest.join('.'))
}
