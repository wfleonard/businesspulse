import { readFile } from 'fs/promises'
import path from 'path'
import { measurementId } from '@/components/GoogleAnalytics'
import { withAnalytics } from '@/lib/scan-page'

export const dynamic = 'force-dynamic'

/**
 * /scan: the ad landing page. It's a finished, self-contained HTML page with
 * its own design, so it's served as its own document instead of a React page:
 * the site's layout and global CSS never load on it, and its stylesheet
 * (public/scan/styles.css) loads nowhere else. Its script is
 * public/scan/script.js, and its form posts to /api/scan-requests.
 *
 * The only change made here is adding Google Analytics in production, the
 * same property the rest of the public site uses. It's noindex: ads bring its
 * visitors, and in search it would only compete with the homepage. Crawlers
 * may still fetch it (robots.txt allows it), which is how they see the noindex. page.html is shipped in the
 * standalone build through outputFileTracingIncludes in next.config.ts.
 */
const TEMPLATE = path.join(process.cwd(), 'src', 'app', 'scan', 'page.html')

export async function GET() {
  let html: string
  try {
    html = await readFile(TEMPLATE, 'utf8')
  } catch {
    return new Response('Not found', { status: 404 })
  }
  return new Response(withAnalytics(html, measurementId()), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'X-Robots-Tag': 'noindex, follow',
    },
  })
}
