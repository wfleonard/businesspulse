import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import {
  dashboardStats,
  funnelStats,
  generatedServiceCounts,
  listLeads,
  panelOptions,
  type FunnelStats,
  type LeadRow,
} from '@/lib/aeo/admin'
import { filtersToQuery, LEAD_STATUSES, parseLeadFilters } from '@/lib/aeo/lead-filters'
import { requireSession } from '@/lib/session'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Leads | BusinessPulse' }

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

const LEAD_LIMIT = 500

const inputClass =
  'rounded-md border border-border bg-white px-2 py-1.5 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary/30'

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
  }).format(date)
}

function usd(value: string | number | null): string {
  return `$${Number(value ?? 0).toFixed(3)}`
}

function Score({ lead }: { lead: LeadRow }) {
  if (!lead.runId) return <span className="text-text-secondary">{lead.verifiedAt ? 'no run' : '-'}</span>
  if (lead.runStatus === 'done') {
    return (
      <span className="font-medium text-dark">
        {lead.citedCount}/{lead.questionCount}
      </span>
    )
  }
  // Queued after an attempt means the worker is retrying the questions it missed.
  const label = lead.runStatus === 'queued' && (lead.runAttempts ?? 0) > 0 ? 'retrying' : lead.runStatus
  return <span className={lead.runStatus === 'failed' ? 'text-danger' : 'text-text-secondary'}>{label}</span>
}

function Funnel({ funnel }: { funnel: FunnelStats }) {
  const steps = [
    { label: 'Requested', value: funnel.requested },
    { label: 'Verified', value: funnel.verified },
    { label: 'Report ready', value: funnel.ready },
    { label: 'Report viewed', value: funnel.viewed },
    { label: 'Clicked Book a call', value: funnel.clickedBook },
    { label: 'Contacted', value: funnel.contacted },
    { label: 'Won', value: funnel.won },
  ]
  return (
    <Card className="p-4">
      <p className="text-xs text-text-secondary">
        Funnel for public-form requests from the last {funnel.days} days (outbound snapshots not included)
      </p>
      <ol className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
        {steps.map((step, index) => {
          const previous = index > 0 ? steps[index - 1].value : null
          return (
            <li key={step.label}>
              <p className="text-xl font-semibold text-dark">{step.value}</p>
              <p className="text-xs text-dark">{step.label}</p>
              {previous !== null && (
                <p className="text-xs text-text-secondary">
                  {previous > 0 ? `${Math.round((step.value / previous) * 100)}% of previous` : '-'}
                </p>
              )}
            </li>
          )
        })}
      </ol>
    </Card>
  )
}

export default async function LeadsPage({ searchParams }: Props) {
  // The layout's check isn't enough: layouts and pages render in parallel, so a
  // page that only relied on it could stream lead data before the redirect.
  await requireSession()
  const filters = parseLeadFilters(await searchParams)
  const [leads, stats, panels, generated, funnel] = await Promise.all([
    listLeads(filters),
    dashboardStats(),
    panelOptions(),
    generatedServiceCounts(),
    funnelStats(30),
  ])
  const overCap = stats.spentTodayUsd >= stats.dailyCapUsd
  const query = filtersToQuery(filters)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark">Leads</h1>
          <p className="mt-1 text-text-secondary">AI visibility snapshot requests, newest first.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/aeo/new"
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90"
          >
            Run a snapshot
          </Link>
          <a
            href={`/dashboard/aeo/export${query}`}
            className="rounded-md border border-border bg-white px-3 py-1.5 text-sm font-medium text-dark hover:bg-gray-50"
          >
            Export CSV
          </a>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-text-secondary">Spent today (UTC)</p>
          <p className={`mt-1 text-xl font-semibold ${overCap ? 'text-danger' : 'text-dark'}`}>
            {usd(stats.spentTodayUsd)}{' '}
            <span className="text-sm font-normal text-text-secondary">of ${stats.dailyCapUsd.toFixed(2)} cap</span>
          </p>
          {overCap && <p className="mt-1 text-xs text-danger">New runs wait until tomorrow; admin re-runs still go.</p>}
        </Card>
        <Card className="p-4">
          <p className="text-xs text-text-secondary">Queue</p>
          <p className="mt-1 text-xl font-semibold text-dark">
            {stats.queued} <span className="text-sm font-normal text-text-secondary">waiting,</span> {stats.running}{' '}
            <span className="text-sm font-normal text-text-secondary">running</span>
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-text-secondary">Shown</p>
          <p className="mt-1 text-xl font-semibold text-dark">
            {leads.length} <span className="text-sm font-normal text-text-secondary">requests</span>
          </p>
          {leads.length === LEAD_LIMIT && (
            <p className="mt-1 text-xs text-text-secondary">Newest {LEAD_LIMIT} only. Narrow the filters.</p>
          )}
        </Card>
      </div>

      <Funnel funnel={funnel} />

      <form method="get" className="flex flex-wrap items-end gap-3 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-secondary">Industry</span>
          <select name="vertical" defaultValue={filters.vertical ?? ''} className={inputClass}>
            <option value="">All</option>
            {panels.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
            <option value="generated">Generated</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-secondary">Source</span>
          <select name="source" defaultValue={filters.source ?? ''} className={inputClass}>
            <option value="">All</option>
            <option value="form">Public form</option>
            <option value="outbound">Outbound</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-secondary">Lead status</span>
          <select name="status" defaultValue={filters.leadStatus ?? ''} className={inputClass}>
            <option value="">All</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-secondary">Verified</span>
          <select
            name="verified"
            defaultValue={filters.verified === undefined ? '' : filters.verified ? 'yes' : 'no'}
            className={inputClass}
          >
            <option value="">All</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-secondary">Cited, at least</span>
          <input name="min" type="number" min={0} defaultValue={filters.minCited ?? ''} className={`${inputClass} w-24`} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-secondary">Cited, at most</span>
          <input name="max" type="number" min={0} defaultValue={filters.maxCited ?? ''} className={`${inputClass} w-24`} />
        </label>
        <button type="submit" className="rounded-md bg-primary px-3 py-1.5 font-medium text-white hover:bg-primary/90">
          Apply
        </button>
        {query && (
          <Link href="/dashboard/aeo" className="py-1.5 text-text-secondary hover:text-dark">
            Clear
          </Link>
        )}
      </form>

      {leads.length === 0 ? (
        <Card>
          <h2 className="text-sm font-semibold text-dark">{query ? 'No requests match these filters' : 'No leads yet'}</h2>
          <p className="mt-2 text-sm text-text-secondary">
            {query ? 'Try clearing a filter.' : 'Snapshot requests from the public form will appear here.'}
          </p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-bg text-xs text-text-secondary">
              <tr>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Business</th>
                <th className="px-3 py-2 font-medium">Industry</th>
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2 font-medium">Verified</th>
                <th className="px-3 py-2 font-medium">Cited</th>
                <th className="px-3 py-2 font-medium">Lead</th>
                <th className="px-3 py-2 text-right font-medium">Cost</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.requestId} className="border-b border-border align-top last:border-0">
                  <td className="whitespace-nowrap px-3 py-2 text-text-secondary">{formatDate(lead.createdAt)}</td>
                  <td className="px-3 py-2">
                    {lead.runId ? (
                      <Link href={`/dashboard/aeo/${lead.runId}`} className="font-medium text-primary hover:underline">
                        {lead.businessName}
                      </Link>
                    ) : (
                      <span className="font-medium text-dark">{lead.businessName}</span>
                    )}
                    <div className="text-xs text-text-secondary">
                      {lead.domain} · {lead.city}, {lead.state}
                    </div>
                    {lead.source === 'outbound' && <div className="text-xs font-medium text-primary">Outbound</div>}
                  </td>
                  <td className="px-3 py-2 text-text-secondary">{lead.panelName ?? lead.panelSlug ?? 'Generated'}</td>
                  <td className="px-3 py-2">
                    <div className="text-dark">{lead.email || '-'}</div>
                    {lead.contactConsent && <div className="text-xs text-success">OK to contact</div>}
                  </td>
                  <td className="px-3 py-2 text-text-secondary">{lead.verifiedAt ? 'Yes' : 'No'}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <Score lead={lead} />
                    {(lead.reportViews ?? 0) > 0 && (
                      <div className="text-xs text-text-secondary">
                        Viewed {lead.reportViews === 1 ? 'once' : `${lead.reportViews} times`}
                      </div>
                    )}
                    {lead.bookingClicks > 0 && <div className="text-xs text-success">Clicked Book a call</div>}
                  </td>
                  <td className="px-3 py-2 text-text-secondary">{lead.leadStatus}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-text-secondary">
                    {lead.runId ? usd(lead.costUsd) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {generated.length > 0 && (
        <Card>
          <h2 className="text-sm font-semibold text-dark">Generated panels by stated service</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Verified requests with no canned panel. A service with about 10 is worth a canned panel.
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            {generated.map((g) => (
              <li key={g.service} className="flex justify-between gap-4">
                <span className="text-dark">{g.service}</span>
                <span className="text-text-secondary">{g.requests}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
