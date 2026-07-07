import 'server-only'
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { metricDefinition, metricValue } from '@/lib/db/schema'
import { listAccounts, getAccountPeriodSums, getLedgerDateRange } from './store'
import { generatePeriods } from '@/lib/reports/period'
import {
  buildProfitAndLoss,
  buildPayroll,
  isCashAccount,
  indexPeriodSums,
} from '@/lib/reports/build'

/**
 * Derive headline financial KPIs from the general ledger into metric_value, so
 * the dashboard, Ask, Business Watch and Actions all operate on real financials.
 * Idempotent: replaces all derived metrics for the org each run.
 */

type Direction = 'up_good' | 'down_good'
const DERIVED: { key: string; label: string; direction: Direction }[] = [
  { key: 'total_revenue', label: 'Total Revenue', direction: 'up_good' },
  { key: 'total_expenses', label: 'Total Expenses', direction: 'down_good' },
  { key: 'net_profit', label: 'Net Profit', direction: 'up_good' },
  { key: 'payroll_expense', label: 'Payroll', direction: 'down_good' },
  { key: 'cash_balance', label: 'Cash Balance', direction: 'up_good' },
]
const DERIVED_KEYS = DERIVED.map((d) => d.key)

function monthEnd(start: Date): Date {
  return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0))
}

export async function deriveMetricsFromLedger(orgId: string): Promise<number> {
  const range = await getLedgerDateRange(orgId)
  if (!range) return 0

  const accounts = await listAccounts(orgId)
  const periods = generatePeriods(range.min, range.max, 'month')
  const sums = await getAccountPeriodSums(orgId, 'month', range.min, range.max)

  const pl = buildProfitAndLoss(accounts, sums, periods, 'month')
  const payroll = buildPayroll(accounts, sums, periods, 'month')

  // Running end-of-month cash balance from cash-account net changes.
  const cashIds = new Set(accounts.filter(isCashAccount).map((a) => a.id))
  const idx = indexPeriodSums(sums, 'month')
  let cashRunning = 0
  const cashBalance = periods.map((p) => {
    let change = 0
    for (const id of cashIds) change += idx.get(id)?.get(p.key) ?? 0
    cashRunning = Math.round((cashRunning + change) * 100) / 100
    return cashRunning
  })

  // Ensure metric definitions exist.
  for (const d of DERIVED) {
    await db
      .insert(metricDefinition)
      .values({ orgId, key: d.key, label: d.label, unit: '$', category: 'Financials', direction: d.direction })
      .onConflictDoUpdate({
        target: [metricDefinition.orgId, metricDefinition.key],
        set: { label: d.label, unit: '$', direction: d.direction },
      })
  }

  // Replace derived metric values.
  await db
    .delete(metricValue)
    .where(and(eq(metricValue.orgId, orgId), inArray(metricValue.metricKey, DERIVED_KEYS)))

  const rows: (typeof metricValue.$inferInsert)[] = []
  periods.forEach((p, i) => {
    const end = monthEnd(p.start)
    const point = (key: string, value: number) => {
      rows.push({ orgId, metricKey: key, periodStart: p.start, periodEnd: end, value: String(value) })
    }
    point('total_revenue', pl.income.subtotal[i])
    point('total_expenses', pl.expenses.subtotal[i])
    point('net_profit', pl.netProfit[i])
    point('payroll_expense', payroll.subtotal[i] ?? 0)
    point('cash_balance', cashBalance[i])
  })
  if (rows.length > 0) await db.insert(metricValue).values(rows)

  return rows.length
}
