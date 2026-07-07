import Link from 'next/link'
import { requireOrg } from '@/lib/org'
import { listAccounts } from '@/lib/ledger/store'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { AccountsImport, TransactionsImport } from '@/components/accounting/LedgerImport'

export const metadata = { title: 'Accounting — BusinessPulse' }

const typeLabel: Record<string, string> = {
  asset: 'Assets',
  liability: 'Liabilities',
  equity: 'Equity',
  income: 'Income',
  expense: 'Expenses',
}
const typeOrder = ['income', 'expense', 'asset', 'liability', 'equity']

export default async function AccountingPage() {
  const { orgId } = await requireOrg()
  const accounts = await listAccounts(orgId)
  const byType = new Map<string, typeof accounts>()
  for (const a of accounts) {
    const arr = byType.get(a.type) ?? []
    arr.push(a)
    byType.set(a.type, arr)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark">Accounting</h1>
          <p className="mt-1 text-text-secondary">
            Import your chart of accounts + transactions; reports build themselves from your books.
          </p>
        </div>
        <Link href="/dashboard/reports">
          <Button variant="secondary">View reports</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-dark">1 · Import chart of accounts</h2>
          <AccountsImport />
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-dark">2 · Import transactions</h2>
          <TransactionsImport />
        </Card>
      </div>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-dark">
          Chart of accounts ({accounts.length})
        </h2>
        {accounts.length === 0 ? (
          <p className="text-sm text-text-secondary">No accounts yet — import your chart above.</p>
        ) : (
          <div className="space-y-4">
            {typeOrder
              .filter((t) => byType.has(t))
              .map((t) => (
                <div key={t}>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    {typeLabel[t]}
                  </h3>
                  <ul className="divide-y divide-border">
                    {byType.get(t)!.map((a) => (
                      <li key={a.id} className="flex items-center justify-between py-1.5 text-sm">
                        <span className="text-dark">
                          {a.code ? <span className="text-text-secondary">{a.code} · </span> : null}
                          {a.name}
                        </span>
                        {a.subtype && (
                          <span className="text-xs text-text-secondary">{a.subtype}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
        )}
      </Card>
    </div>
  )
}
