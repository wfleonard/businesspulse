import {
  normalizeAccountType,
  parseAccountsCsv,
  parseTransactionsCsv,
  isDebitNormal,
} from '@/lib/ledger/import'
import type { AccountType } from '@/lib/reports/build'

describe('normalizeAccountType', () => {
  it('maps common accounting labels', () => {
    expect(normalizeAccountType('Income')).toEqual({ type: 'income' })
    expect(normalizeAccountType('Cost of Goods Sold')).toEqual({ type: 'expense', subtype: 'cogs' })
    expect(normalizeAccountType('Payroll Expenses')).toEqual({ type: 'expense', subtype: 'payroll' })
    expect(normalizeAccountType('Bank')).toEqual({ type: 'asset', subtype: 'bank' })
    expect(normalizeAccountType('Accounts Receivable')).toEqual({
      type: 'asset',
      subtype: 'accounts_receivable',
    })
    expect(normalizeAccountType('Credit Card')).toEqual({ type: 'liability', subtype: 'credit_card' })
    expect(normalizeAccountType('Owner Equity')).toEqual({ type: 'equity' })
  })
  it('returns null for unknown', () => {
    expect(normalizeAccountType('Blorp')).toBeNull()
  })
})

describe('parseAccountsCsv', () => {
  it('parses accounts and infers type/subtype', () => {
    const csv = `name,type,code
Sales,Income,4000
COGS,Cost of Goods Sold,5000
Checking,Bank,1000`
    const res = parseAccountsCsv(csv)
    expect(res.errors).toHaveLength(0)
    expect(res.accounts).toHaveLength(3)
    expect(res.accounts[1]).toMatchObject({ name: 'COGS', type: 'expense', subtype: 'cogs' })
    expect(res.accounts[2]).toMatchObject({ type: 'asset', subtype: 'bank' })
  })
  it('flags unrecognized type', () => {
    const res = parseAccountsCsv('name,type\nX,Nonsense')
    expect(res.accounts).toHaveLength(0)
    expect(res.errors[0].message).toMatch(/Unrecognized/)
  })
})

describe('isDebitNormal', () => {
  it('asset/expense are debit-normal', () => {
    expect(isDebitNormal('asset')).toBe(true)
    expect(isDebitNormal('expense')).toBe(true)
    expect(isDebitNormal('income')).toBe(false)
    expect(isDebitNormal('liability')).toBe(false)
  })
})

describe('parseTransactionsCsv', () => {
  const types = new Map<string, AccountType>([
    ['Sales', 'income'],
    ['Checking', 'asset'],
    ['Rent', 'expense'],
  ])

  it('uses a natural-direction amount column directly', () => {
    const csv = `date,account,amount,description
2026-06-01,Sales,10000,June sales
2026-06-02,Rent,2000,Office rent`
    const res = parseTransactionsCsv(csv, types)
    expect(res.errors).toHaveLength(0)
    expect(res.entries[0]).toMatchObject({ accountName: 'Sales', amount: 10000 })
    expect(res.entries[0].date.getUTCFullYear()).toBe(2026)
  })

  it('converts debit/credit to natural direction by account type', () => {
    const csv = `date,account,debit,credit
2026-06-01,Checking,500,0
2026-06-01,Sales,0,500`
    const res = parseTransactionsCsv(csv, types)
    // asset (debit-normal): debit - credit = +500
    expect(res.entries[0].amount).toBe(500)
    // income (credit-normal): credit - debit = +500
    expect(res.entries[1].amount).toBe(500)
  })

  it('handles accounting-style parentheses negatives', () => {
    const csv = `date,account,amount\n2026-06-03,Checking,"(800)"`
    const res = parseTransactionsCsv(csv, types)
    expect(res.entries[0].amount).toBe(-800)
  })

  it('errors on unknown account and bad date', () => {
    const csv = `date,account,amount
2026-06-01,Ghost,100
not-a-date,Sales,100`
    const res = parseTransactionsCsv(csv, types)
    expect(res.entries).toHaveLength(0)
    expect(res.errors.map((e) => e.message).join(' ')).toMatch(/Unknown account/)
    expect(res.errors.map((e) => e.message).join(' ')).toMatch(/Invalid date/)
  })

  it('requires amount or debit+credit', () => {
    const res = parseTransactionsCsv('date,account\n2026-06-01,Sales', types)
    expect(res.errors[0].message).toMatch(/amount.*debit.*credit/i)
  })
})
