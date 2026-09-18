import { NextResponse, type NextRequest } from 'next/server'

/**
 * Security proxy (Next.js 16 proxy convention, formerly middleware):
 *  - Sets hardening headers on every response (HSTS, CSP, frame/mime/referrer).
 *  - Static-friendly CSP: script-src 'self' 'unsafe-inline'. A per-request nonce
 *    can't work here because static-generated pages bake their HTML (and script
 *    tags) at build time, so a runtime nonce never matches — it blocks Next's
 *    own scripts and the page renders blank. Sources are still restricted to
 *    'self' (no third-party script/style hosts); dev also allows eval + ws.
 *  - Optimistic auth gate: redirects unauthenticated requests for /dashboard to
 *    /login based on session-cookie presence. Real enforcement is server-side
 *    via requireSession(); this is only a fast redirect.
 */

const PROTECTED_PREFIXES = ['/dashboard']

// Private-by-link pages: reports and email verification stay out of search.
const NOINDEX_PREFIXES = ['/report/', '/check/', '/book']

// Cookie names better-auth may set (prefix "bp"; __Secure- prefix in prod).
const SESSION_COOKIE_NAMES = ['bp.session_token', '__Secure-bp.session_token']

function hasSessionCookie(req: NextRequest): boolean {
  return SESSION_COOKIE_NAMES.some((name) => Boolean(req.cookies.get(name)?.value))
}

// Cloudflare Turnstile: the bot check on the public snapshot form loads a script
// and renders its challenge in an iframe from this origin.
const TURNSTILE_ORIGIN = 'https://challenges.cloudflare.com'

function buildCsp(isProd: boolean): string {
  const directives = [
    "default-src 'self'",
    // Dev needs 'unsafe-eval' for Turbopack HMR; prod does not.
    isProd
      ? `script-src 'self' 'unsafe-inline' ${TURNSTILE_ORIGIN}`
      : `script-src 'self' 'unsafe-eval' 'unsafe-inline' ${TURNSTILE_ORIGIN}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    isProd ? `connect-src 'self' ${TURNSTILE_ORIGIN}` : `connect-src 'self' ws: wss: ${TURNSTILE_ORIGIN}`,
    `frame-src ${TURNSTILE_ORIGIN}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ]
  if (isProd) directives.push('upgrade-insecure-requests')
  return directives.join('; ')
}

export default function proxy(req: NextRequest) {
  const isProd = process.env.NODE_ENV === 'production'

  // Optimistic auth gate.
  const { pathname } = req.nextUrl
  if (PROTECTED_PREFIXES.some((p) => pathname.startsWith(p)) && !hasSessionCookie(req)) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  const csp = buildCsp(isProd)
  const res = NextResponse.next()

  res.headers.set('content-security-policy', csp)
  res.headers.set('x-content-type-options', 'nosniff')
  res.headers.set('x-frame-options', 'DENY')
  res.headers.set('referrer-policy', 'strict-origin-when-cross-origin')
  res.headers.set(
    'permissions-policy',
    'camera=(), microphone=(), geolocation=(), browsing-topics=()'
  )
  if (NOINDEX_PREFIXES.some((p) => pathname.startsWith(p))) {
    res.headers.set('x-robots-tag', 'noindex, nofollow')
  }
  if (isProd) {
    res.headers.set(
      'strict-transport-security',
      'max-age=63072000; includeSubDomains; preload'
    )
  }
  return res
}

export const config = {
  // Run on everything except static assets and image optimizer.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)'],
}
