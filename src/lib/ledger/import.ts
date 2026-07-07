import { parseCsv } from '@/lib/metrics/csv'
import type { AccountType } from '@/lib/reports/build'

/**
 * Generic accounting CSV importers. Map QuickBooks/Wave/other exports onto our
 * general ledger. Pure & testable — no DB. Amounts are normalized to the
 * account's NATURAL direction (positive increases its normal balance).
 */

export function isDebitNormal(type: AccountType): boolean {
  return type === 'asset' || type === 'expense'
}

/** Map a raw account-type label (any accounting app) to our type + subtype. */
export function normalizeAccountType(
  raw: string
): { type: AccountType; subtype?: string } | null {
  const s = raw.trim().toLowerCase()
  if (!s) return null
  if (/cost of goods|cogs/.test(s)) return { type: 'expense', subtype: 'cogs' }
  if (/payroll|wage|salar/.test(s)) return { type: 'expense', subtype: 'payroll' }
  if (/accounts?\s*receivable|(^|\W)a\/?r(\W|$)/.test(s))
    return { type: 'asset', subtype: 'accounts_receivable' }
  if (/accounts?\s*payable|(^|\W)a\/?p(\W|$)/.test(s))
    return { type: 'liability', subtype: 'accounts_payable' }
  if (/credit card/.test(s)) return { type: 'liability', subtype: 'credit_card' }
  if (/bank|cash|checking|savings/.test(s)) return { type: 'asset', subtype: 'bank' }
  if (/fixed asset|equipment|property|depreciat/.test(s))
    return { type: 'asset', subtype: 'fixed_asset' }
  if (/other income/.test(s)) return { type: 'income', subtype: 'other_income' }
  if (/other expense/.test(s)) return { type: 'expense', subtype: 'other_expense' }
  if (/income|revenue|sales/.test(s)) return { type: 'income' }
  if (/expense|expenditure|operating/.test(s)) return { type: 'expense' }
  if (/receivable/.test(s)) return { type: 'asset', subtype: 'accounts_receivable' }
  if (/payable|loan|liabilit|note payable/.test(s)) return { type: 'liability' }
  if (/equity|retained earnings|owner|capital/.test(s)) return { type: 'equity' }
  if (/asset/.test(s)) return { type: 'asset' }
  if (['asset', 'liability', 'equity', 'income', 'expense'].includes(s))
    return { type: s as AccountType }
  return null
}

function num(v: string | undefined): number | null {
  if (v == null) return null
  const cleaned = v.replace(/[$,\s()]/g, '')
  if (cleaned === '') return null
  // parentheses = negative (accounting style)
  const neg = /\(/.test(v)
  const n = Number(cleaned)
  if (!Number.isFinite(n)) return null
  return neg ? -Math.abs(n) : n
}

function header(table: string[][]): { head: string[]; rows: string[][] } {
  const nonEmpty = table.filter((r) => r.some((c) => c.trim() !== ''))
  return { head: (nonEmpty[0] ?? []).map((h) => h.trim().toLowerCase()), rows: nonEmpty.slice(1) }
}

export type ParsedAccount = { code: string | null; name: string; type: AccountType; subtype: string | null }
export type AccountsResult = { accounts: ParsedAccount[]; errors: { line: number; message: string }[] }

/** Chart-of-accounts CSV: columns name, type, [subtype], [code]. */
export function parseAccountsCsv(text: string): AccountsResult {
  const out: AccountsResult = { accounts: [], errors: [] }
  const table = parseCsv(text)
  if (table.length === 0) {
    out.errors.push({ line: 0, message: 'Empty file' })
    return out
  }
  const { head, rows } = header(table)
  const iName = head.indexOf('name')
  const iType = head.indexOf('type')
  const iSub = head.indexOf('subtype')
  const iCode = head.indexOf('code')
  if (iName === -1 || iType === -1) {
    out.errors.push({ line: 1, message: 'Missing required column(s): name, type' })
    return out
  }
  rows.forEach((cells, r) => {
    const name = cells[iName]?.trim() ?? ''
    const typeRaw = cells[iType]?.trim() ?? ''
    if (!name) {
      out.errors.push({ line: r + 2, message: 'Missing name' })
      return
    }
    const norm = normalizeAccountType(typeRaw)
    if (!norm) {
      out.errors.push({ line: r + 2, message: `Unrecognized account type "${typeRaw}"` })
      return
    }
    const subtype = (iSub !== -1 ? cells[iSub]?.trim() : '') || norm.subtype || null
    out.accounts.push({
      code: (iCode !== -1 ? cells[iCode]?.trim() : '') || null,
      name,
      type: norm.type,
      subtype,
    })
  })
  return out
}

export type ParsedEntry = {
  accountName: string
  date: Date
  amount: number
  description: string | null
  party: string | null
}
export type EntriesResult = { entries: ParsedEntry[]; errors: { line: number; message: string }[] }

const PARTY_COLS = ['party', 'name', 'vendor', 'customer', 'payee']

/**
 * Transactions CSV: columns date, account, and either `amount` (already natural
 * direction) OR `debit` + `credit` (converted via account type). Optional
 * description and a party column. `accountTypes` maps account name -> type.
 */
export function parseTransactionsCsv(
  text: string,
  accountTypes: Map<string, AccountType>
): EntriesResult {
  const out: EntriesResult = { entries: [], errors: [] }
  const table = parseCsv(text)
  if (table.length === 0) {
    out.errors.push({ line: 0, message: 'Empty file' })
    return out
  }
  const { head, rows } = header(table)
  const iDate = head.indexOf('date')
  const iAccount = head.indexOf('account')
  const iAmount = head.indexOf('amount')
  const iDebit = head.indexOf('debit')
  const iCredit = head.indexOf('credit')
  const iDesc = head.indexOf('description') !== -1 ? head.indexOf('description') : head.indexOf('memo')
  const iParty = PARTY_COLS.map((c) => head.indexOf(c)).find((i) => i !== -1) ?? -1

  if (iDate === -1 || iAccount === -1) {
    out.errors.push({ line: 1, message: 'Missing required column(s): date, account' })
    return out
  }
  if (iAmount === -1 && (iDebit === -1 || iCredit === -1)) {
    out.errors.push({ line: 1, message: 'Need an "amount" column, or both "debit" and "credit"' })
    return out
  }

  // case-insensitive account lookup
  const typeByLower = new Map<string, AccountType>()
  for (const [k, v] of accountTypes) typeByLower.set(k.toLowerCase(), v)

  rows.forEach((cells, r) => {
    const line = r + 2
    const accountName = cells[iAccount]?.trim() ?? ''
    if (!accountName) {
      out.errors.push({ line, message: 'Missing account' })
      return
    }
    const type = typeByLower.get(accountName.toLowerCase())
    if (!type) {
      out.errors.push({ line, message: `Unknown account "${accountName}" — import accounts first` })
      return
    }
    const date = new Date(cells[iDate]?.trim() ?? '')
    if (Number.isNaN(date.getTime())) {
      out.errors.push({ line, message: 'Invalid date' })
      return
    }

    let amount: number | null
    if (iAmount !== -1) {
      amount = num(cells[iAmount])
    } else {
      const debit = num(cells[iDebit]) ?? 0
      const credit = num(cells[iCredit]) ?? 0
      amount = isDebitNormal(type) ? debit - credit : credit - debit
    }
    if (amount === null || !Number.isFinite(amount)) {
      out.errors.push({ line, message: 'Invalid amount' })
      return
    }

    out.entries.push({
      accountName,
      date,
      amount,
      description: (iDesc !== -1 ? cells[iDesc]?.trim() : '') || null,
      party: (iParty !== -1 ? cells[iParty]?.trim() : '') || null,
    })
  })
  return out
}
