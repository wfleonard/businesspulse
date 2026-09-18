import { listLeads } from '@/lib/aeo/admin'
import { toCsv } from '@/lib/aeo/csv'
import { appUrl } from '@/lib/aeo/emails'
import { parseLeadFilters } from '@/lib/aeo/lead-filters'
import { requireSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

/** CSV of the lead list, with the same filters as /dashboard/aeo. */
export async function GET(req: Request) {
  await requireSession()

  const url = new URL(req.url)
  const leads = await listLeads(parseLeadFilters(Object.fromEntries(url.searchParams)))

  const csv = toCsv(
    [
      'created_at', 'source', 'business_name', 'domain', 'service', 'city', 'state', 'industry', 'email',
      'contact_consent', 'verified_at', 'lead_status', 'run_status', 'questions_answered', 'cited',
      'cost_usd', 'report_views', 'report_first_viewed_at', 'booking_clicks', 'report_url',
    ],
    leads.map((lead) => [
      lead.createdAt,
      lead.source,
      lead.businessName,
      lead.domain,
      lead.service,
      lead.city,
      lead.state,
      lead.panelName ?? (lead.panelSlug || 'generated'),
      lead.email,
      lead.contactConsent,
      lead.verifiedAt,
      lead.leadStatus,
      lead.runStatus,
      lead.runStatus === 'done' ? lead.questionCount : null,
      lead.runStatus === 'done' ? lead.citedCount : null,
      lead.runId ? Number(lead.costUsd) : null,
      lead.runId ? lead.reportViews : null,
      lead.reportFirstViewedAt,
      lead.runId ? lead.bookingClicks : null,
      lead.publicId ? appUrl(`/report/${lead.publicId}`) : null,
    ])
  )

  const date = new Date().toISOString().slice(0, 10)
  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="businesspulse-leads-${date}.csv"`,
      'cache-control': 'no-store',
    },
  })
}
