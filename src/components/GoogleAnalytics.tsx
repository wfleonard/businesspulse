import Script from 'next/script'

/**
 * Google Analytics (GA4), for public marketing pages only: home, privacy, and
 * later the Resource Hub.
 *
 * Never render this on /report, /check, /book, /dashboard, or /login. GA sends
 * each page's full URL to Google, and on those pages the URL is a secret: the
 * report ID is the only thing protecting a report, and the verification link
 * carries a one-time token.
 *
 * Production only, so local runs don't count as visits. GA_MEASUREMENT_ID
 * overrides the default property.
 */

const DEFAULT_MEASUREMENT_ID = 'G-9LM5D025CR'
const MEASUREMENT_ID = /^G-[A-Z0-9]{4,20}$/

/** The GA4 ID to load, or null. Validated because it's written into an inline script. */
export function measurementId(env: Record<string, string | undefined> = process.env): string | null {
  if (env.NODE_ENV !== 'production') return null
  const id = env.GA_MEASUREMENT_ID?.trim() || DEFAULT_MEASUREMENT_ID
  return MEASUREMENT_ID.test(id) ? id : null
}

export function GoogleAnalytics() {
  const id = measurementId()
  if (!id) return null

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${id}');`}
      </Script>
    </>
  )
}
