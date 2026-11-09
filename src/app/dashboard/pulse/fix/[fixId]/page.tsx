import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ConfirmSubmit } from '@/components/aeo/ConfirmSubmit'
import { Card } from '@/components/ui/Card'
import { getFixRequest } from '@/lib/aeo/fix-requests'
import { requireAdmin } from '@/lib/session'
import { declineFixAction, finishFixAction, quoteFixAction, startFixAction } from '../../actions'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Fix request | BusinessPulse' }

type Props = {
  params: Promise<{ fixId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const inputClass = 'w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'
const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })

function money(cents: number): string {
  return '$' + (cents / 100).toFixed(2)
}

/** One fix request for the admin: the issues as agreed, the client's note, and the next step. */
export default async function FixRequestPage({ params, searchParams }: Props) {
  await requireAdmin()
  const { fixId } = await params
  if (!UUID.test(fixId)) notFound()
  const row = await getFixRequest(fixId)
  if (!row) notFound()
  const query = await searchParams
  const { request: fix, owner } = row
  const defaultScope = fix.scope || fix.issues.map((issue, i) => `${i + 1}. ${issue.title}`).join('\n')

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/dashboard/pulse" className="text-sm text-primary hover:underline">
          Pulse
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-dark">Fix request: {row.businessName ?? '(deleted business)'}</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {row.domain} · {owner?.name} ({owner?.email}) · requested {dateFormat.format(fix.createdAt)} · status{' '}
          <strong>{fix.status.replace('_', ' ')}</strong>
          {fix.paidAt && ` · paid ${money(fix.amountTotal)} incl. ${money(fix.amountTax)} tax`}
        </p>
        {row.reportPublicId && (
          <Link href={'/dashboard/pulse/report/' + row.reportPublicId} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
            Open the report
          </Link>
        )}
        {typeof query.notice === 'string' && <p className="mt-4 rounded-md bg-success/10 px-3 py-2 text-sm text-success">{query.notice}</p>}
        {typeof query.error === 'string' && <p className="mt-4 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{query.error}</p>}
      </div>

      {fix.clientNote && (
        <Card>
          <h2 className="text-sm font-semibold text-dark">From the client</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-dark">{fix.clientNote}</p>
        </Card>
      )}

      <Card>
        <h2 className="text-lg font-semibold text-dark">The {fix.issues.length} issues they asked about</h2>
        <ol className="mt-3 space-y-3 text-sm">
          {fix.issues.map((issue, i) => (
            <li key={issue.title}>
              <p className="font-medium text-dark">
                {i + 1}. {issue.title} <span className="font-normal text-text-secondary">({issue.priority}, {issue.effort})</span>
              </p>
              <ul className="mt-1 list-disc pl-5 text-text-secondary">
                {issue.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </Card>

      {(fix.status === 'requested' || fix.status === 'quoted') && (
        <Card>
          <h2 className="text-lg font-semibold text-dark">{fix.status === 'quoted' ? 'Change the scope or amount' : 'Confirm the scope and amount'}</h2>
          <p className="mt-1 text-sm text-text-secondary">
            The client sees this text before paying. Sending emails them a link to pay from their account.
          </p>
          <form action={quoteFixAction} className="mt-4 space-y-3">
            <input type="hidden" name="fixId" value={fix.id} />
            <label className="block text-sm font-medium text-dark">
              What&apos;s included
              <textarea name="scope" rows={8} defaultValue={defaultScope} className={'mt-1 ' + inputClass} />
            </label>
            <label className="block text-sm font-medium text-dark">
              Amount in dollars, before tax
              <input name="amount" type="number" min="1" step="1" defaultValue={fix.amountCents / 100} className={'mt-1 max-w-40 ' + inputClass} />
            </label>
            <ConfirmSubmit
              message="Send this scope and amount to the client? They're emailed a link to pay."
              className="bg-primary text-white hover:bg-primary/90"
            >
              {fix.status === 'quoted' ? 'Send the update' : 'Send to the client'}
            </ConfirmSubmit>
          </form>
          <form action={declineFixAction} className="mt-6 space-y-2 border-t border-border pt-4">
            <input type="hidden" name="fixId" value={fix.id} />
            <label className="block text-sm font-medium text-dark">
              Or decline, with a note the client will see
              <textarea name="note" rows={2} className={'mt-1 ' + inputClass} />
            </label>
            <ConfirmSubmit message="Decline this request? The client is emailed your note." className="border border-border bg-white text-dark hover:bg-gray-50">
              Decline
            </ConfirmSubmit>
          </form>
        </Card>
      )}

      {fix.status === 'paid' && (
        <Card>
          <h2 className="text-lg font-semibold text-dark">Paid: start the work</h2>
          <form action={startFixAction} className="mt-3">
            <input type="hidden" name="fixId" value={fix.id} />
            <ConfirmSubmit message="Mark this fix in progress? The client sees it in their account." className="bg-primary text-white hover:bg-primary/90">
              Mark in progress
            </ConfirmSubmit>
          </form>
        </Card>
      )}

      {(fix.status === 'paid' || fix.status === 'in_progress') && (
        <Card>
          <h2 className="text-lg font-semibold text-dark">Finished?</h2>
          <form action={finishFixAction} className="mt-3 space-y-2">
            <input type="hidden" name="fixId" value={fix.id} />
            <label className="block text-sm font-medium text-dark">
              Note for the client: what you changed (optional)
              <textarea name="note" rows={4} className={'mt-1 ' + inputClass} />
            </label>
            <ConfirmSubmit message="Mark this fix done? The client is emailed." className="bg-primary text-white hover:bg-primary/90">
              Mark done
            </ConfirmSubmit>
          </form>
        </Card>
      )}

      {fix.scope && fix.status !== 'requested' && fix.status !== 'quoted' && (
        <Card>
          <h2 className="text-sm font-semibold text-dark">Agreed scope ({money(fix.amountCents)} before tax)</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-dark">{fix.scope}</p>
          {fix.adminNote && <p className="mt-3 whitespace-pre-wrap text-sm text-text-secondary">Note: {fix.adminNote}</p>}
        </Card>
      )}
    </div>
  )
}
