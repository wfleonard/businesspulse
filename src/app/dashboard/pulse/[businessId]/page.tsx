import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AutoRefresh } from '@/components/aeo/AutoRefresh'
import { ConfirmSubmit } from '@/components/aeo/ConfirmSubmit'
import { Card } from '@/components/ui/Card'
import { BusinessPanelEditor } from '@/components/aeo/BusinessPanelEditor'
import { SCOPE_LABEL, type ServiceScope } from '@/lib/aeo/brief'
import { PULSE_COST_PER_QUESTION_USD } from '@/lib/aeo/business-panel'
import { listBusinessPanels } from '@/lib/aeo/business-panel-jobs'
import { DRAFT_CATEGORIES } from '@/lib/aeo/panel-draft'
import { categoryLabel } from '@/lib/aeo/report'
import { getPulseBusiness } from '@/lib/aeo/pulse'
import { stateInfo } from '@/lib/aeo/states'
import { requireAdmin } from '@/lib/session'
import { redraftPanel, rereadSite, saveBusinessPanel } from '../actions'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Business | Pulse | BusinessPulse' }

type Props = {
  params: Promise<{ businessId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function scopeLabel(scope: string): string {
  return SCOPE_LABEL[scope as ServiceScope] ?? scope
}

type PanelRow = Awaited<ReturnType<typeof listBusinessPanels>>[number]

function panelSummary(drafting: boolean, editable: PanelRow | null, briefStatus: string | undefined): string {
  if (drafting) return 'Drafting a new version from the confirmed brief. This page updates on its own.'
  if (!editable) return briefStatus === 'confirmed' ? 'No panel yet.' : 'Drafted once the client confirms their brief.'
  const parts = [
    'Version ' + editable.version + ', ' + (editable.status === 'draft' ? 'waiting for your review' : 'approved'),
  ]
  if (editable.sourcePanels.length) parts.push('library: ' + editable.sourcePanels.join(', '))
  if (editable.model) parts.push(editable.model)
  parts.push('drafting cost $' + Number(editable.costUsd).toFixed(2))
  return parts.join(' · ')
}

function versionLabel(p: PanelRow): string {
  let label = 'v' + p.version + ' ' + p.status
  if (p.status === 'approved' && p.approvedAt) label += ' ' + p.approvedAt.toLocaleDateString('en-US')
  if (p.error) label += ' (' + p.error + ')'
  return label
}

function Sources({ urls }: { urls: string[] }) {
  if (urls.length === 0) return <span className="text-xs text-amber-700"> (no page cited)</span>
  return (
    <span className="text-xs text-text-secondary">
      {' '}
      ({urls.map((u) => new URL(u).pathname).join(', ')})
    </span>
  )
}

/**
 * One client business for the admin: profile, the brief from its site, and
 * what the client changed when confirming, and its question panel to review and approve.
 */
export default async function PulseBusinessPage({ params, searchParams }: Props) {
  await requireAdmin()
  const { businessId } = await params
  if (!UUID.test(businessId)) notFound()
  const row = await getPulseBusiness(businessId)
  if (!row) notFound()
  const query = await searchParams
  const notice = query.notice
  const error = query.error
  const { business: biz, brief: briefRow } = row
  const panels = await listBusinessPanels(biz.id)
  // The version to review: a draft if one waits, else the approved one.
  const editable = panels.find((p) => p.status === 'draft') ?? panels.find((p) => p.status === 'approved') ?? null
  const drafting = panels.some((p) => p.status === 'queued' || p.status === 'drafting')
  const brief = briefRow?.brief ?? null
  const confirmed = briefRow?.confirmed ?? null
  const reading = briefRow?.status === 'queued' || briefRow?.status === 'reading'

  const removed = brief && confirmed ? brief.offerings.map((o) => o.name).filter((n) => !confirmed.offerings.includes(n)) : []
  const added = brief && confirmed ? confirmed.offerings.filter((n) => !brief.offerings.some((o) => o.name === n)) : []

  return (
    <div className="space-y-8">
      {(reading || drafting) && <AutoRefresh seconds={15} />}
      <div>
        <Link href="/dashboard/pulse" className="text-sm text-primary hover:underline">
          Pulse
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-dark">{biz.name}</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {biz.domain}
          {biz.otherDomains.length > 0 && ` + ${biz.otherDomains.join(', ')}`} · {row.ownerName} ({row.ownerEmail}) ·{' '}
          {biz.panelSlug ?? `Custom: ${biz.customIndustry}`} · {biz.service} · {biz.city},{' '}
          {stateInfo(biz.state)?.name ?? biz.state}
        </p>
        {typeof notice === 'string' && (
          <p className="mt-4 rounded-md bg-success/10 px-3 py-2 text-sm text-success">{notice}</p>
        )}
        {typeof error === 'string' && <p className="mt-4 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      </div>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-dark">Question panel</h2>
            <p className="mt-1 text-sm text-text-secondary">{panelSummary(drafting, editable, briefRow?.status)}</p>
            {panels.length > 0 && (
              <p className="mt-1 text-xs text-text-secondary">
                Versions: {panels.map((p) => versionLabel(p)).join(' · ')}
              </p>
            )}
          </div>
          {briefRow?.status === 'confirmed' && !drafting && (
            <form action={redraftPanel}>
              <input type="hidden" name="businessId" value={biz.id} />
              <ConfirmSubmit
                message="Draft a new panel from the confirmed brief? Your edits to an unapproved draft are replaced. About $0.50 in AI spend."
                className="border border-border bg-white text-dark hover:bg-gray-50"
              >
                {editable ? 'Draft again' : 'Draft panel'}
              </ConfirmSubmit>
            </form>
          )}
        </div>
        {editable && !drafting && (
          <div className="mt-6">
            <BusinessPanelEditor
              key={editable.id + '-' + editable.updatedAt.getTime()}
              businessId={biz.id}
              panelId={editable.id}
              status={editable.status}
              questions={editable.questions}
              directoryDomains={editable.directoryDomains}
              referenceDomains={editable.referenceDomains}
              note={editable.note}
              categories={DRAFT_CATEGORIES.map((value) => ({ value, label: categoryLabel(value) }))}
              offerings={briefRow?.confirmed?.offerings ?? []}
              costPerQuestion={PULSE_COST_PER_QUESTION_USD}
              action={saveBusinessPanel}
            />
          </div>
        )}
      </Card>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-dark">Brief</h2>
            <p className="mt-1 text-sm text-text-secondary">
              {briefRow
                ? `${briefRow.status}${briefRow.readAt ? ` · read ${briefRow.readAt.toLocaleString('en-US', { timeZone: 'America/New_York' })}` : ''} · ${briefRow.pages.length} pages (${briefRow.crawlSource ?? 'not read yet'}) · $${Number(briefRow.costUsd).toFixed(2)}${brief ? ` · ${brief.model}` : ''}`
                : 'No brief yet.'}
            </p>
            {briefRow?.error && <p className="mt-1 text-sm text-danger">{briefRow.error}</p>}
          </div>
          <form action={rereadSite}>
            <input type="hidden" name="businessId" value={biz.id} />
            <ConfirmSubmit
              message={`Read ${biz.domain} again and write a new brief? The client will be asked to confirm it again. About $1 in AI spend.`}
              className="border border-border bg-white text-dark hover:bg-gray-50"
            >
              Read site again
            </ConfirmSubmit>
          </form>
        </div>

        {brief && (
          <div className="mt-6 space-y-5 text-sm">
            {!brief.siteRead && (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-amber-800">
                The site couldn&apos;t be read; this brief is from the profile alone.
              </p>
            )}
            <p className="text-dark">{brief.summary}</p>

            <div>
              <h3 className="font-semibold text-dark">Sells</h3>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {brief.offerings.map((o) => (
                  <li key={o.name} className={removed.includes(o.name) ? 'text-text-secondary line-through' : 'text-dark'}>
                    {o.main && <strong>Main: </strong>}
                    {o.name}
                    {o.detail && <span className="text-text-secondary">: {o.detail}</span>}
                    <Sources urls={o.sources} />
                  </li>
                ))}
                {added.map((name) => (
                  <li key={name} className="text-success">
                    {name} <span className="text-xs">(added by client)</span>
                  </li>
                ))}
              </ul>
            </div>

            {brief.notOffered.length > 0 && (
              <div>
                <h3 className="font-semibold text-dark">Doesn&apos;t offer</h3>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-dark">
                  {brief.notOffered.map((n) => (
                    <li key={n.name}>
                      {n.name}
                      {n.reason && <span className="text-text-secondary">: {n.reason}</span>}
                      <Sources urls={n.sources} />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h3 className="font-semibold text-dark">Buyers</h3>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-dark">
                {brief.buyers.map((b) => (
                  <li key={b.type} className={confirmed && !confirmed.buyers.includes(b.type) ? 'text-text-secondary line-through' : ''}>
                    {b.type}
                    {b.detail && <span className="text-text-secondary">: {b.detail}</span>}
                  </li>
                ))}
                {confirmed?.buyers
                  .filter((b) => !brief.buyers.some((x) => x.type === b))
                  .map((b) => (
                    <li key={b} className="text-success">
                      {b} <span className="text-xs">(added by client)</span>
                    </li>
                  ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-dark">Service area</h3>
              <p className="mt-1 text-dark">
                {scopeLabel(brief.serviceArea.scope)}
                {confirmed && confirmed.scope !== brief.serviceArea.scope && (
                  <span className="text-success"> → client says: {scopeLabel(confirmed.scope)}</span>
                )}
                . {brief.serviceArea.detail}
              </p>
              <p className="mt-1 text-text-secondary">
                {[
                  brief.serviceArea.sellsOnline && 'sells online',
                  brief.serviceArea.visitsCustomers && 'visits customers',
                  brief.serviceArea.hasStorefront && 'has a storefront',
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              <p className="mt-1 text-dark">Places: {(confirmed?.places ?? brief.serviceArea.places).join('; ') || '-'}</p>
            </div>

            {brief.differentiators.length > 0 && (
              <div>
                <h3 className="font-semibold text-dark">Sets it apart</h3>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-dark">
                  {brief.differentiators.map((d) => (
                    <li key={d.text}>
                      {d.text}
                      <Sources urls={d.sources} />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h3 className="font-semibold text-dark">Industry panels to draw on</h3>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-dark">
                {brief.industryPanels.length === 0 && <li>None fit.</li>}
                {brief.industryPanels.map((p) => (
                  <li key={p.slug}>
                    <strong>{p.slug}</strong> ({p.fit}): {p.reason}
                  </li>
                ))}
              </ul>
            </div>

            {brief.gaps.length > 0 && (
              <div>
                <h3 className="font-semibold text-dark">Asked the client</h3>
                <ul className="mt-1 list-disc space-y-2 pl-5 text-dark">
                  {brief.gaps.map((g) => {
                    const answer = confirmed?.answers?.find((a) => a.question === g)?.answer
                    return (
                      <li key={g}>
                        {g}
                        <p className={answer ? 'mt-0.5 whitespace-pre-wrap text-success' : 'mt-0.5 text-text-secondary'}>
                          {answer ? 'Client: ' + answer : confirmed ? 'Not answered' : 'Waiting for the client to confirm'}
                        </p>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {confirmed?.notes && (
              <div>
                <h3 className="font-semibold text-dark">Client&apos;s notes</h3>
                <p className="mt-1 whitespace-pre-wrap text-dark">{confirmed.notes}</p>
              </div>
            )}
          </div>
        )}
      </Card>

      {briefRow && briefRow.pages.length > 0 && (
        <Card>
          <h2 className="text-lg font-semibold text-dark">Pages read</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {briefRow.pages.map((p) => (
              <li key={p.url}>
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  {new URL(p.url).pathname}
                </a>{' '}
                <span className="text-text-secondary">{p.title}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
