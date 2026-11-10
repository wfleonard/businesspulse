import { and, asc, eq } from 'drizzle-orm'
import { answerCard, type CardMode, type CardSize } from '@/lib/aeo/answer-card'
import { verdictOf } from '@/lib/aeo/report'
import { ENGINE_LABELS } from '@/lib/aeo/pulse-report'
import { db } from '@/lib/db'
import { aeoRequest, aeoResult, aeoRun, business } from '@/lib/db/schema'
import { requireAdmin } from '@/lib/session'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Props = { params: Promise<{ runId: string }> }

/**
 * An answer card image for one stored answer: ?result=<id>&size=square|wide&mode=outreach|public.
 * Admins only. Add &download=1 to save it instead of viewing it.
 */
export async function GET(req: Request, { params }: Props) {
  await requireAdmin()
  const { runId } = await params
  const url = new URL(req.url)
  const resultId = url.searchParams.get('result') ?? ''
  const size: CardSize = url.searchParams.get('size') === 'wide' ? 'wide' : 'square'
  const mode: CardMode = url.searchParams.get('mode') === 'public' ? 'public' : 'outreach'
  if (!UUID.test(runId) || !UUID.test(resultId)) return new Response('Not found', { status: 404 })

  const [row] = await db
    .select({ result: aeoResult, domain: aeoRun.domain, clientName: business.name })
    .from(aeoResult)
    .innerJoin(aeoRun, eq(aeoRun.id, aeoResult.runId))
    .leftJoin(business, eq(business.id, aeoRun.businessId))
    .where(and(eq(aeoResult.id, resultId), eq(aeoResult.runId, runId)))
    .limit(1)
  if (!row) return new Response('Not found', { status: 404 })

  const [request] = await db
    .select({ businessName: aeoRequest.businessName })
    .from(aeoRequest)
    .where(eq(aeoRequest.runId, runId))
    .orderBy(asc(aeoRequest.createdAt))
    .limit(1)

  const { result } = row
  const cited = result.rivals
    .filter((r) => r.cited && !/\.(gov|mil)$/.test(r.host))
    .map((r) => ({ host: r.host, title: r.title }))

  const image = answerCard({
    question: result.query,
    assistant: ENGINE_LABELS[result.engine] ?? result.engine,
    cited,
    verdict: verdictOf(result),
    businessName: row.clientName || request?.businessName || row.domain,
    size,
    mode,
  })

  const name = `answer-card-${row.domain.replace(/[^a-z0-9.-]/gi, '')}-${size}${mode === 'public' ? '-public' : ''}.png`
  const headers = new Headers(image.headers)
  headers.set('content-disposition', `${url.searchParams.get('download') ? 'attachment' : 'inline'}; filename="${name}"`)
  headers.set('cache-control', 'private, no-store')
  return new Response(image.body, { status: 200, headers })
}

