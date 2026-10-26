import type { Metadata } from 'next'
import { ConfirmSubmit } from '@/components/aeo/ConfirmSubmit'
import { listAccessRequests, listUsers, type AccessRequestRow } from '@/lib/access/requests'
import { requireSession } from '@/lib/session'
import { approveRequest, declineRequest, removeAccess, resendPasswordLink } from './actions'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Users | BusinessPulse' }

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
  }).format(date)
}

const buttonClass = 'rounded-md border border-border bg-white px-2 py-1 text-xs font-medium text-dark hover:bg-gray-50'

const STATUS_CLASS: Record<AccessRequestRow['status'], string> = {
  pending: 'text-primary',
  approved: 'text-success',
  declined: 'text-text-secondary',
}

export default async function UsersPage({ searchParams }: Props) {
  const { user: me } = await requireSession()
  const params = await searchParams
  const notice = typeof params.notice === 'string' ? params.notice : null
  const error = typeof params.error === 'string' ? params.error : null
  const [requests, users] = await Promise.all([listAccessRequests(), listUsers()])
  const pending = requests.filter((r) => r.status === 'pending').length

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-dark">Users</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Everyone with a login sees every lead and report. People ask at /request-access; approving them emails a link
          to set a password.
        </p>
        {notice && <p className="mt-4 rounded-md bg-success/10 px-3 py-2 text-sm text-success">{notice}</p>}
        {error && <p className="mt-4 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      </div>

      <section>
        <h2 className="text-lg font-semibold text-dark">
          Access requests{pending > 0 && <span className="ml-2 text-sm font-normal text-primary">{pending} waiting</span>}
        </h2>
        {requests.length === 0 ? (
          <p className="mt-2 text-sm text-text-secondary">No requests yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-bg text-xs text-text-secondary">
                <tr>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Person</th>
                  <th className="px-3 py-2 font-medium">Why</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-b border-border align-top last:border-0">
                    <td className="whitespace-nowrap px-3 py-2 text-text-secondary">{formatDate(r.createdAt)}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-dark">{r.name}</div>
                      <div className="text-xs text-text-secondary">{r.email}</div>
                    </td>
                    <td className="max-w-xs whitespace-pre-wrap px-3 py-2 text-dark">{r.note || <span className="text-text-secondary">Not given</span>}</td>
                    <td className={`whitespace-nowrap px-3 py-2 capitalize ${STATUS_CLASS[r.status]}`}>
                      {r.status}
                      {r.decidedAt && <div className="text-xs normal-case text-text-secondary">{formatDate(r.decidedAt)}</div>}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-right">
                      {r.status === 'pending' && (
                        <div className="flex items-center justify-end gap-1">
                          <form action={approveRequest}>
                            <input type="hidden" name="requestId" value={r.id} />
                            <ConfirmSubmit
                              message={`Give ${r.name} (${r.email}) a login? They'll see every lead and report.`}
                              className="bg-primary px-2 py-1 text-xs text-white hover:bg-primary/90"
                            >
                              Approve
                            </ConfirmSubmit>
                          </form>
                          <form action={declineRequest}>
                            <input type="hidden" name="requestId" value={r.id} />
                            <button type="submit" className={buttonClass}>
                              Decline
                            </button>
                          </form>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-dark">People with a login</h2>
        <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-bg text-xs text-text-secondary">
              <tr>
                <th className="px-3 py-2 font-medium">Person</th>
                <th className="px-3 py-2 font-medium">Since</th>
                <th className="px-3 py-2 font-medium">Password</th>
                <th className="px-3 py-2">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border align-top last:border-0">
                  <td className="px-3 py-2">
                    <div className="font-medium text-dark">
                      {u.name}
                      {u.id === me.id && <span className="ml-2 text-xs font-normal text-text-secondary">(you)</span>}
                    </div>
                    <div className="text-xs text-text-secondary">{u.email}</div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-text-secondary">{formatDate(u.createdAt)}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {u.hasPassword ? (
                      <span className="text-dark">Set</span>
                    ) : (
                      <span className="text-primary">Not set yet</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right">
                    {u.id !== me.id && (
                      <div className="flex items-center justify-end gap-1">
                        <form action={resendPasswordLink}>
                          <input type="hidden" name="userId" value={u.id} />
                          <button type="submit" className={buttonClass}>
                            {u.hasPassword ? 'Send reset link' : 'Resend link'}
                          </button>
                        </form>
                        <form action={removeAccess}>
                          <input type="hidden" name="userId" value={u.id} />
                          <ConfirmSubmit
                            message={`Remove ${u.email}'s login? They'll be signed out and can't sign in again.`}
                            className="px-2 py-1 text-xs text-text-secondary hover:bg-danger/5 hover:text-danger"
                          >
                            Remove
                          </ConfirmSubmit>
                        </form>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
