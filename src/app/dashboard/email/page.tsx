import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { listEmailLeads, outreachConfig, recentSends } from '@/lib/aeo/outreach'
import { requireSession } from '@/lib/session'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Email | BusinessPulse' }

function formatDate(date: Date | null): string {
  if (!date) return '-'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' }).format(date)
}

export default async function EmailPage() {
  await requireSession()
  const [leads, sends] = await Promise.all([listEmailLeads(), recentSends()])
  const config = outreachConfig()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark">Email</h1>
          <p className="mt-1 text-text-secondary">
            Follow up one at a time with people who got a report and ticked &quot;You can contact me&quot;. Anyone who
            unsubscribed or whose details were erased drops off this list.
          </p>
        </div>
        <Link
          href="/dashboard/email/templates"
          className="rounded-md border border-border bg-white px-3 py-1.5 text-sm font-medium text-dark hover:bg-gray-50"
        >
          Templates
        </Link>
      </div>

      {!config.from && (
        <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          Sending is off: set OUTREACH_FROM (or MAILTRAP_SENDER) and MAILTRAP_API_TOKEN.
        </p>
      )}
      {config.from && (
        <p className="text-sm text-text-secondary">
          From {config.from.name} &lt;{config.from.email}&gt;
          {config.replyTo ? `, replies to ${config.replyTo.email}` : ', no reply-to set (replies go to the sender address)'}
          {config.bcc.length ? `, copy to ${config.bcc.join(', ')}` : ''}.
        </p>
      )}

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-gray-50 text-xs text-text-secondary">
            <tr>
              <th className="px-4 py-2 font-medium">Business</th>
              <th className="px-4 py-2 font-medium">Industry</th>
              <th className="px-4 py-2 text-right font-medium">Cited</th>
              <th className="px-4 py-2 font-medium">Report</th>
              <th className="px-4 py-2 text-right font-medium">Views</th>
              <th className="px-4 py-2 text-right font-medium">Book clicks</th>
              <th className="px-4 py-2 font-medium">Emails</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-text-secondary">
                  No one to email yet.
                </td>
              </tr>
            )}
            {leads.map((l) => (
              <tr key={l.requestId} className="border-b border-border last:border-0">
                <td className="px-4 py-2">
                  <Link href={`/dashboard/email/${l.requestId}`} className="font-medium text-primary hover:underline">
                    {l.businessName}
                  </Link>
                  <p className="text-xs text-text-secondary">
                    {l.domain} · {l.city}, {l.state}
                  </p>
                </td>
                <td className="px-4 py-2 text-text-secondary">{l.panelName ?? 'Generated'}</td>
                <td className="px-4 py-2 text-right">
                  {l.citedCount ?? '-'}/{l.questionCount ?? '-'}
                </td>
                <td className="px-4 py-2 text-text-secondary">{formatDate(l.finishedAt)}</td>
                <td className="px-4 py-2 text-right">{l.reportViews}</td>
                <td className="px-4 py-2 text-right">{l.bookingClicks}</td>
                <td className="px-4 py-2 text-text-secondary">
                  {l.emailsSent ? `${l.emailsSent}, last ${formatDate(l.lastEmailAt)}` : 'none'}
                </td>
                <td className="px-4 py-2 text-text-secondary">{l.leadStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div>
        <h2 className="text-lg font-semibold text-dark">Recent emails</h2>
        {sends.length === 0 ? (
          <p className="mt-2 text-sm text-text-secondary">Nothing sent yet.</p>
        ) : (
          <Card className="mt-3 overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <tbody>
                {sends.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 text-text-secondary">{formatDate(s.sentAt)}</td>
                    <td className="px-4 py-2">
                      <Link href={`/dashboard/email/${s.requestId}`} className="text-primary hover:underline">
                        {s.businessName || s.domain}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-dark">{s.subject || '(erased)'}</td>
                    <td className="px-4 py-2">
                      {s.status === 'sent' ? (
                        <span className="text-success">sent</span>
                      ) : (
                        <span className="text-danger" title={s.error ?? ''}>
                          failed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  )
}
