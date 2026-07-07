import Link from 'next/link'
import { requireOrg } from '@/lib/org'
import {
  defaultRange,
  getProfitAndLoss,
  getBalanceSheet,
  getCashMovement,
  getPayroll,
} from '@/lib/reports/generate'
import type { Granularity } from '@/lib/ledger/store'
import { getLedgerDateRange } from '@/lib/ledger/store'
import { Card } from '@/components/ui/Card'
import { LedgerTable, type Line } from '@/components/reports/LedgerTable'
import { formatMoney, generatePeriods } from '@/lib/reports/period'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Reports — BusinessPulse' }

const REPORTS = [
  { id: 'pnl', label: 'Profit & Loss' },
  { id: 'balance', label: 'Balance Sheet' },
  { id: 'cash', label: 'Cash' },
  { id: 'payroll', label: 'Payroll' },
] as const
const GRANS: Granularity[] = ['month', 'quarter', 'year']

type SP = { report?: string; g?: string }

function tab(key: string, href: string, active: boolean, label: string) {
  return (
    <Link
      key={key}
      href={href}
      className={cn(
        'rounded-md px-3 py-1.5 text-sm',
        active ? 'bg-primary text-white' : 'border border-border text-text-secondary hover:bg-gray-50'
      )}
    >
      {label}
    </Link>
  )
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { orgId } = await requireOrg()
  const sp = await searchParams
  const report = (REPORTS.find((r) => r.id === sp.report)?.id ?? 'pnl') as (typeof REPORTS)[number]['id']
  const g = (GRANS.includes(sp.g as Granularity) ? sp.g : 'month') as Granularity

  const hasData = (await getLedgerDateRange(orgId)) !== null
  const { from, to } = await defaultRange(orgId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark">Reports</h1>
        <p className="mt-1 text-text-secondary">Standard financial reports, built from your ledger.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {REPORTS.map((r) =>
          tab(`r-${r.id}`, `/dashboard/reports?report=${r.id}&g=${g}`, report === r.id, r.label)
        )}
        {report !== 'balance' && (
          <>
            <span className="mx-2 text-border">|</span>
            {GRANS.map((gran) =>
              tab(
                `g-${gran}`,
                `/dashboard/reports?report=${report}&g=${gran}`,
                g === gran,
                gran[0].toUpperCase() + gran.slice(1)
              )
            )}
          </>
        )}
      </div>

      {!hasData ? (
        <Card>
          <p className="text-sm text-text-secondary">
            No ledger data yet.{' '}
            <Link href="/dashboard/accounting" className="text-primary hover:underline">
              Import your accounts + transactions
            </Link>{' '}
            to generate reports.
          </p>
        </Card>
      ) : (
        <Card>{await renderReport(orgId, report, g, from, to)}</Card>
      )}
    </div>
  )
}

async function renderReport(
  orgId: string,
  report: (typeof REPORTS)[number]['id'],
  g: Granularity,
  from: Date,
  to: Date
) {
  if (report === 'pnl') {
    const pl = await getProfitAndLoss(orgId, g, from, to)
    const lines: Line[] = [
      { label: 'Income', values: [], heading: true },
      ...pl.income.rows.map((r) => ({ label: r.label, values: r.values })),
      { label: 'Total income', values: pl.income.subtotal, bold: true },
      { label: 'Expenses', values: [], heading: true },
      ...pl.expenses.rows.map((r) => ({ label: r.label, values: r.values })),
      { label: 'Total expenses', values: pl.expenses.subtotal, bold: true },
      { label: 'Net profit', values: pl.netProfit, bold: true },
    ]
    return <LedgerTable periods={pl.periods} lines={lines} />
  }

  if (report === 'cash') {
    const cm = await getCashMovement(orgId, g, from, to)
    const lines: Line[] = [
      ...cm.accounts.rows.map((r) => ({ label: r.label, values: r.values })),
      { label: 'Net cash change', values: cm.netChange, bold: true },
    ]
    return <LedgerTable periods={cm.periods} lines={lines} />
  }

  if (report === 'payroll') {
    const pr = await getPayroll(orgId, g, from, to)
    if (pr.rows.length === 0) {
      return <p className="text-sm text-text-secondary">No payroll accounts found in your ledger.</p>
    }
    const lines: Line[] = [
      ...pr.rows.map((r) => ({ label: r.label, values: r.values })),
      { label: 'Total payroll', values: pr.subtotal, bold: true },
    ]
    return <LedgerTable periods={generatePeriods(from, to, g)} lines={lines} />
  }

  // balance sheet
  const bs = await getBalanceSheet(orgId, to)
  const group = (title: string, rows: { label: string; balance: number }[], total: number) => (
    <div className="mb-4">
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-secondary">{title}</h3>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="py-1 text-dark">{r.label}</td>
              <td className="py-1 text-right tabular-nums text-text-secondary">{formatMoney(r.balance)}</td>
            </tr>
          ))}
          <tr className="border-t border-border">
            <td className="py-1 font-semibold text-dark">Total {title.toLowerCase()}</td>
            <td className="py-1 text-right font-semibold tabular-nums text-dark">{formatMoney(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
  return (
    <div>
      <p className="mb-4 text-xs text-text-secondary">
        As of {bs.asOf.toLocaleDateString('en-US', { timeZone: 'UTC' })}
        {bs.balanced ? '' : ' · note: assets ≠ liabilities + equity (partial ledger)'}
      </p>
      {group('Assets', bs.assets.rows, bs.assets.total)}
      {group('Liabilities', bs.liabilities.rows, bs.liabilities.total)}
      {group('Equity', bs.equity.rows, bs.equity.total)}
    </div>
  )
}
