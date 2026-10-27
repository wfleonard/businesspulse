import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { DraftForm, PublishForm } from '@/components/aeo/PanelForms'
import { Card } from '@/components/ui/Card'
import { getBacklogEntry } from '@/lib/aeo/panel-admin'
import { validatePanelContent } from '@/lib/aeo/panel-content'
import { requireAdmin } from '@/lib/session'
import { setBacklogStatus } from '../../actions'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Backlog panel | BusinessPulse' }

type Props = { params: Promise<{ slug: string }> }

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/New_York' }).format(
    new Date(iso)
  )
}

export default async function BacklogEntryPage({ params }: Props) {
  await requireAdmin()
  const { slug } = await params
  const entry = await getBacklogEntry(slug)
  if (!entry) notFound()
  if (entry.live) redirect(`/dashboard/panels/${slug}`)

  const draft = entry.draft
  const problems = draft ? validatePanelContent(draft) : []

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/panels" className="text-sm text-primary hover:underline">
          ← Panels
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-dark">
              #{entry.rank} {entry.name}
            </h1>
            <p className="mt-1 text-text-secondary">{entry.buyers}</p>
            <p className="mt-1 text-sm text-text-secondary">{entry.rationale}</p>
          </div>
          <form action={setBacklogStatus}>
            <input type="hidden" name="slug" value={entry.slug} />
            <input type="hidden" name="status" value={entry.status === 'skipped' ? 'planned' : 'skipped'} />
            <button
              type="submit"
              className="rounded-md border border-border bg-white px-3 py-1.5 text-sm font-medium text-dark hover:bg-gray-50"
            >
              {entry.status === 'skipped' ? 'Restore to the backlog' : 'Skip this one'}
            </button>
          </form>
        </div>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-dark">{draft ? 'Redraft' : 'Draft'}</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Claude writes about 60 buyer questions plus directory and reference domains for this industry. Each draft costs
          roughly $0.10 to $0.30.
        </p>
        <div className="mt-4">
          <DraftForm slug={entry.slug} guidance={entry.guidance} hasDraft={Boolean(draft)} />
        </div>
      </Card>

      {draft && (
        <Card>
          <h2 className="text-lg font-semibold text-dark">Review and publish</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Drafted {formatDateTime(draft.generatedAt)} by {draft.model} for ${draft.costUsd.toFixed(3)}. Uncheck anything
            that doesn&apos;t fit, then publish.
          </p>
          {problems.length > 0 && (
            <div className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <p>As drafted, this panel has problems to fix before it can publish:</p>
              <ul className="mt-1 list-disc pl-5">
                {problems.slice(0, 10).map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-4">
            <PublishForm
              slug={entry.slug}
              name={draft.name}
              questions={draft.questions}
              directoryDomains={draft.directoryDomains}
              referenceDomains={draft.referenceDomains}
            />
          </div>
        </Card>
      )}
    </div>
  )
}
