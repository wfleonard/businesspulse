import { periodKey, type Granularity, type Period } from './period'

export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense'

export type AccountLite = {
  id: string
  code: string | null
  name: string
  type: AccountType
  subtype: string | null
}

export type PeriodSumLite = { accountId: string; periodStart: Date; total: number }

export type ReportRow = {
  accountId: string
  label: string
  values: number[] // per period
  total: number
}

export type Section = {
  title: string
  rows: ReportRow[]
  subtotal: number[] // per period
  subtotalTotal: number
}

/** Index period sums into accountId -> periodKey -> total. */
export function indexPeriodSums(
  sums: PeriodSumLite[],
  g: Granularity
): Map<string, Map<string, number>> {
  const idx = new Map<string, Map<string, number>>()
  for (const s of sums) {
    const key = periodKey(s.periodStart, g)
    let byPeriod = idx.get(s.accountId)
    if (!byPeriod) {
      byPeriod = new Map()
      idx.set(s.accountId, byPeriod)
    }
    byPeriod.set(key, (byPeriod.get(key) ?? 0) + s.total)
  }
  return idx
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function buildSection(
  title: string,
  accounts: AccountLite[],
  idx: Map<string, Map<string, number>>,
  periods: Period[]
): Section {
  const rows: ReportRow[] = accounts.map((a) => {
    const byPeriod = idx.get(a.id)
    const values = periods.map((p) => round2(byPeriod?.get(p.key) ?? 0))
    return {
      accountId: a.id,
      label: a.name,
      values,
      total: round2(values.reduce((x, y) => x + y, 0)),
    }
  })
  const subtotal = periods.map((_, i) => round2(rows.reduce((sum, r) => sum + r.values[i], 0)))
  return {
    title,
    rows,
    subtotal,
    subtotalTotal: round2(subtotal.reduce((x, y) => x + y, 0)),
  }
}

/* ------------------------------- P&L ------------------------------- */

export type ProfitAndLoss = {
  periods: Period[]
  income: Section
  expenses: Section
  netProfit: number[]
  netProfitTotal: number
}

export function buildProfitAndLoss(
  accounts: AccountLite[],
  sums: PeriodSumLite[],
  periods: Period[],
  g: Granularity
): ProfitAndLoss {
  const idx = indexPeriodSums(sums, g)
  const income = buildSection('Income', accounts.filter((a) => a.type === 'income'), idx, periods)
  const expenses = buildSection('Expenses', accounts.filter((a) => a.type === 'expense'), idx, periods)
  const netProfit = periods.map((_, i) => round2(income.subtotal[i] - expenses.subtotal[i]))
  return {
    periods,
    income,
    expenses,
    netProfit,
    netProfitTotal: round2(netProfit.reduce((x, y) => x + y, 0)),
  }
}

/* --------------------------- Balance sheet -------------------------- */

export type BalanceGroup = {
  title: string
  rows: { accountId: string; label: string; balance: number }[]
  total: number
}

export type BalanceSheet = {
  asOf: Date
  assets: BalanceGroup
  liabilities: BalanceGroup
  equity: BalanceGroup
  balanced: boolean // assets ≈ liabilities + equity
}

function balanceGroup(title: string, accounts: AccountLite[], balances: Map<string, number>): BalanceGroup {
  const rows = accounts
    .map((a) => ({ accountId: a.id, label: a.name, balance: round2(balances.get(a.id) ?? 0) }))
    .filter((r) => r.balance !== 0)
  return { title, rows, total: round2(rows.reduce((s, r) => s + r.balance, 0)) }
}

export function buildBalanceSheet(
  accounts: AccountLite[],
  balances: Map<string, number>,
  asOf: Date
): BalanceSheet {
  const assets = balanceGroup('Assets', accounts.filter((a) => a.type === 'asset'), balances)
  const liabilities = balanceGroup('Liabilities', accounts.filter((a) => a.type === 'liability'), balances)
  const equity = balanceGroup('Equity', accounts.filter((a) => a.type === 'equity'), balances)
  return {
    asOf,
    assets,
    liabilities,
    equity,
    balanced: Math.abs(assets.total - (liabilities.total + equity.total)) < 0.01,
  }
}

/* --------------------------- Cash movement -------------------------- */

export function isCashAccount(a: AccountLite): boolean {
  if (a.type !== 'asset') return false
  const st = (a.subtype ?? '').toLowerCase()
  return st === 'bank' || st === 'cash' || /\b(cash|bank|checking|savings)\b/i.test(a.name)
}

export type CashMovement = {
  periods: Period[]
  accounts: Section
  netChange: number[]
}

export function buildCashMovement(
  accounts: AccountLite[],
  sums: PeriodSumLite[],
  periods: Period[],
  g: Granularity
): CashMovement {
  const idx = indexPeriodSums(sums, g)
  const cash = accounts.filter(isCashAccount)
  const section = buildSection('Cash accounts', cash, idx, periods)
  return { periods, accounts: section, netChange: section.subtotal }
}

/* ------------------------------ Payroll ---------------------------- */

export function isPayrollAccount(a: AccountLite): boolean {
  if (a.type !== 'expense') return false
  const st = (a.subtype ?? '').toLowerCase()
  return st === 'payroll' || /payroll|wage|salar/i.test(a.name)
}

export function buildPayroll(
  accounts: AccountLite[],
  sums: PeriodSumLite[],
  periods: Period[],
  g: Granularity
): Section {
  const idx = indexPeriodSums(sums, g)
  return buildSection('Payroll', accounts.filter(isPayrollAccount), idx, periods)
}
