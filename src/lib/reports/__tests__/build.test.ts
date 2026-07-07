import {
  buildProfitAndLoss,
  buildBalanceSheet,
  buildCashMovement,
  buildPayroll,
  isCashAccount,
  isPayrollAccount,
  type AccountLite,
  type PeriodSumLite,
} from '@/lib/reports/build'
import { generatePeriods } from '@/lib/reports/period'

const accounts: AccountLite[] = [
  { id: 'rev', code: '4000', name: 'Sales Revenue', type: 'income', subtype: null },
  { id: 'cogs', code: '5000', name: 'Cost of Goods Sold', type: 'expense', subtype: 'cogs' },
  { id: 'wages', code: '6000', name: 'Wages & Salaries', type: 'expense', subtype: 'payroll' },
  { id: 'bank', code: '1000', name: 'Business Checking', type: 'asset', subtype: 'bank' },
  { id: 'loan', code: '2000', name: 'Bank Loan', type: 'liability', subtype: null },
  { id: 'eq', code: '3000', name: "Owner's Equity", type: 'equity', subtype: null },
]

const jan = new Date('2026-01-15T00:00:00Z')
const feb = new Date('2026-02-15T00:00:00Z')
const periods = generatePeriods(jan, feb, 'month')

const sums: PeriodSumLite[] = [
  { accountId: 'rev', periodStart: new Date('2026-01-01T00:00:00Z'), total: 10000 },
  { accountId: 'rev', periodStart: new Date('2026-02-01T00:00:00Z'), total: 12000 },
  { accountId: 'cogs', periodStart: new Date('2026-01-01T00:00:00Z'), total: 4000 },
  { accountId: 'cogs', periodStart: new Date('2026-02-01T00:00:00Z'), total: 4500 },
  { accountId: 'wages', periodStart: new Date('2026-01-01T00:00:00Z'), total: 3000 },
  { accountId: 'wages', periodStart: new Date('2026-02-01T00:00:00Z'), total: 3000 },
  { accountId: 'bank', periodStart: new Date('2026-01-01T00:00:00Z'), total: 2500 },
  { accountId: 'bank', periodStart: new Date('2026-02-01T00:00:00Z'), total: -800 },
]

describe('buildProfitAndLoss', () => {
  const pl = buildProfitAndLoss(accounts, sums, periods, 'month')
  it('groups income and expense accounts by period', () => {
    expect(pl.income.rows.map((r) => r.label)).toEqual(['Sales Revenue'])
    expect(pl.income.subtotal).toEqual([10000, 12000])
    expect(pl.expenses.subtotal).toEqual([7000, 7500]) // cogs + wages
  })
  it('computes net profit per period and total', () => {
    expect(pl.netProfit).toEqual([3000, 4500])
    expect(pl.netProfitTotal).toBe(7500)
  })
  it('is self-designing — only the accounts present appear', () => {
    expect(pl.expenses.rows.map((r) => r.label).sort()).toEqual([
      'Cost of Goods Sold',
      'Wages & Salaries',
    ])
  })
})

describe('buildBalanceSheet', () => {
  it('groups balances by type and drops zeros', () => {
    const balances = new Map([
      ['bank', 1700],
      ['loan', 5000],
      ['eq', -3300],
      ['rev', 0], // zero -> dropped
    ])
    const bs = buildBalanceSheet(accounts, balances, feb)
    expect(bs.assets.total).toBe(1700)
    expect(bs.liabilities.total).toBe(5000)
    expect(bs.equity.total).toBe(-3300)
    expect(bs.assets.rows).toHaveLength(1)
  })
})

describe('buildCashMovement', () => {
  it('tracks net change of cash accounts per period', () => {
    const cm = buildCashMovement(accounts, sums, periods, 'month')
    expect(cm.accounts.rows.map((r) => r.label)).toEqual(['Business Checking'])
    expect(cm.netChange).toEqual([2500, -800])
  })
})

describe('buildPayroll', () => {
  it('picks payroll expense accounts', () => {
    const pr = buildPayroll(accounts, sums, periods, 'month')
    expect(pr.rows.map((r) => r.label)).toEqual(['Wages & Salaries'])
    expect(pr.subtotal).toEqual([3000, 3000])
  })
})

describe('classifiers', () => {
  it('isCashAccount matches bank/cash subtype or name', () => {
    expect(isCashAccount(accounts[3])).toBe(true)
    expect(isCashAccount(accounts[0])).toBe(false)
    expect(
      isCashAccount({ id: 'x', code: null, name: 'Petty Cash', type: 'asset', subtype: null })
    ).toBe(true)
  })
  it('isPayrollAccount matches payroll subtype or name', () => {
    expect(isPayrollAccount(accounts[2])).toBe(true)
    expect(isPayrollAccount(accounts[1])).toBe(false)
  })
})
