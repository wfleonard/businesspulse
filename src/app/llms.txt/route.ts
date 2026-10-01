import { publishedArticles } from '@/lib/resources'
import { benchmarkAvailability } from '@/lib/resources/benchmarks'
import { buildLlmsTxt } from '@/lib/resources/llms'

// Built per request, like the sitemap: URLs come from BETTER_AUTH_URL at
// runtime, and benchmarks appear as soon as an industry has enough snapshots.
export const dynamic = 'force-dynamic'

export async function GET() {
  // Like the sitemap, it must still work if the database doesn't.
  let benchmarks: { slug: string; name: string }[] = []
  try {
    benchmarks = (await benchmarkAvailability()).filter((b) => b.available)
  } catch (err) {
    console.error('llms.txt: benchmarks unavailable:', err)
  }

  return new Response(buildLlmsTxt(publishedArticles(false), benchmarks), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
