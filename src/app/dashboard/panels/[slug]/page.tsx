import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ConfirmSubmit } from '@/components/aeo/ConfirmSubmit'
import { RenameForm, SuggestionsForm } from '@/components/aeo/PanelForms'
import { Card } from '@/components/ui/Card'
import { getPanel, listPanelVersions, panelRunRows } from '@/lib/aeo/panel-admin'
import { summarizePanelRuns } from '@/lib/aeo/panel-content'
import { requireSession } from '@/lib/session'
import { togglePanelActive } from '../actions'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Panel | BusinessPulse' }

type Props = { params: Promise<{ slug: string }> }

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/New_York' }).format(date)
}

export default async function PanelPage({ params }: Props) {
  await requireSession()
  const { slug } = await params
  const panel = await getPanel(slug)
  if (!panel) notFound()

  const [versions, rows] = await Promise.all([listPanelVersions(panel.id), panelRunRows(slug)])
  const summary = summarizePanelRuns(panel, rows)
  // Weakest first: those are the ones worth a look.
  const questionStats = [...summary.questions].sort(
    (a, b) => Number(b.weak) - Number(a.weak) || b.noBusinessCited / (b.answered || 1) - a.noBusinessCited / (a.answered || 1)
  )
  const categories = [...new Set(panel.questions.map((q) => q.c))]

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/panels" className="text-sm text-primary hover:underline">
          ← Panels
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-dark">{panel.name}</h1>
            <p className="mt-1 text-text-secondary">
              {panel.slug} · version {panel.version} · {panel.questions.length} questions ·{' '}
              {panel.editedAt ? 'managed in the dashboard' : 'still matches the code seed'}
              {!panel.isActive && ' · inactive'}
            </p>
          </div>
          <form action={togglePanelActive}>
            <input type="hidden" name="slug" value={panel.slug} />
            <input type="hidden" name="active" value={panel.isActive ? 'false' : 'true'} />
            <ConfirmSubmit
              message={
                panel.isActive
                  ? 'Hide this panel from the snapshot form? Existing reports are not affected.'
                  : 'Show this panel in the snapshot form again?'
              }
              className="border border-border bg-white text-dark hover:bg-gray-50"
            >
              {panel.isActive ? 'Deactivate' : 'Activate'}
            </ConfirmSubmit>
          </form>
        </div>
      </div>

      <Card>
        <RenameForm slug={panel.slug} version={panel.version} name={panel.name} />
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-dark">Learn from runs</h2>
        <p className="mt-1 text-sm text-text-secondary">
          From the latest {summary.runs} finished run{summary.runs === 1 ? '' : 's'} of this panel, any version. Changes
          are saved together as the next version; past reports keep the version they ran with.
        </p>
        {summary.runs === 0 ? (
          <p className="mt-4 text-sm text-text-secondary">No finished runs yet. Suggestions appear once snapshots use this panel.</p>
        ) : (
          <div className="mt-4">
            <SuggestionsForm slug={panel.slug} version={panel.version} domains={summary.domains} questions={questionStats} />
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-dark">Current content</h2>
        <div className="mt-4 grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {categories.map((category) => (
              <div key={category}>
                <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">{category}</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-dark">
                  {panel.questions
                    .filter((q) => q.c === category)
                    .map((q) => (
                      <li key={q.q}>{q.q}</li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="space-y-4 text-sm">
            {[
              { label: 'Directory domains', list: panel.directoryDomains },
              { label: 'Reference domains', list: panel.referenceDomains },
              { label: 'Set aside', list: panel.dismissedDomains },
            ].map(({ label, list }) => (
              <div key={label}>
                <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
                  {label} ({list.length})
                </p>
                <p className="mt-1 text-dark">{list.length ? list.join(', ') : '-'}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-dark">Version history</h2>
        {versions.length === 0 ? (
          <p className="mt-2 text-sm text-text-secondary">
            No versions recorded yet. History starts with the next change or the next <code>npm run aeo:panels</code>.
          </p>
        ) : (
          <table className="mt-3 w-full text-left text-sm">
            <thead className="text-xs text-text-secondary">
              <tr>
                <th className="py-1 pr-4 font-normal">Version</th>
                <th className="py-1 pr-4 font-normal">When</th>
                <th className="py-1 pr-4 font-normal">Change</th>
                <th className="py-1 font-normal">Note</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr key={v.id} className="border-t border-border">
                  <td className="py-1.5 pr-4">v{v.version}</td>
                  <td className="py-1.5 pr-4 text-text-secondary">{formatDateTime(v.createdAt)}</td>
                  <td className="py-1.5 pr-4">{v.change}</td>
                  <td className="py-1.5 text-text-secondary">{v.note || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
