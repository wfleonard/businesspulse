import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Composer } from '@/components/aeo/MailForms'
import { Card } from '@/components/ui/Card'
import { getEmailLead, leadFields, listTemplates, sendsForRequest } from '@/lib/aeo/outreach'
import { requireAdmin } from '@/lib/session'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Email a lead | BusinessPulse' }

type Props = { params: Promise<{ requestId: string }> }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/New_York' }).format(date)
}

export default async function EmailLeadPage({ params }: Props) {
  await requireAdmin()
  const { requestId } = await params
  if (!UUID.test(requestId)) notFound()

  const [lead, templates, sends] = await Promise.all([
    getEmailLead(requestId),
    listTemplates({ activeOnly: true }),
    sendsForRequest(requestId),
  ])

  return (
    <div className="space-y-6">
      <Link href="/dashboard/email" className="text-sm text-primary hover:underline">
        ← Email
      </Link>

      {!lead ? (
        <Card>
          <h1 className="text-xl font-bold text-dark">This lead can&apos;t be emailed</h1>
          <p className="mt-2 text-sm text-text-secondary">
            They didn&apos;t tick the contact box, unsubscribed, or their details were erased after four months.
          </p>
        </Card>
      ) : (
        <>
          <div>
            <h1 className="text-2xl font-bold text-dark">{lead.businessName}</h1>
            <p className="mt-1 text-text-secondary">
              {lead.email} · {lead.domain} · {lead.city}, {lead.state} · {lead.panelName ?? 'generated panel'} · cited{' '}
              {lead.citedCount}/{lead.questionCount} · {lead.reportViews} report views · {lead.bookingClicks} book clicks ·{' '}
              <Link href={`/dashboard/aeo/${lead.runId}`} className="text-primary hover:underline">
                lead details
              </Link>
            </p>
          </div>
          <Card>
            <Composer
              requestId={lead.requestId}
              email={lead.email}
              fields={leadFields(lead)}
              templates={templates.map((t) => ({ id: t.id, name: t.name, description: t.description, subject: t.subject, body: t.body }))}
            />
          </Card>
        </>
      )}

      <Card>
        <h2 className="text-lg font-semibold text-dark">Emails sent</h2>
        {sends.length === 0 ? (
          <p className="mt-2 text-sm text-text-secondary">None yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {sends.map((s) => (
              <li key={s.id} className="border-t border-border pt-3 first:border-0 first:pt-0">
                <p className="text-sm">
                  <span className="text-text-secondary">{formatDateTime(s.sentAt)}</span>{' '}
                  <span className="font-medium text-dark">{s.subject || '(erased)'}</span>{' '}
                  {s.templateName && <span className="text-text-secondary">· {s.templateName}</span>}{' '}
                  {s.status === 'failed' && <span className="text-danger">· failed: {s.error}</span>}
                </p>
                {s.body && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-xs text-primary">Show text</summary>
                    <pre className="mt-1 whitespace-pre-wrap font-sans text-sm text-dark">{s.body}</pre>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
