import 'server-only'
import { sql, and, eq, gte, lte, asc, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { ledgerAccount, ledgerEntry } from '@/lib/db/schema'

export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense'
export type Granularity = 'month' | 'quarter' | 'year'
const GRANULARITIES: Granularity[] = ['month', 'quarter', 'year']

export type AccountRow = {
  id: string
  code: string | null
  name: string
  type: AccountType
  subtype: string | null
  isActive: boolean
}

export async function listAccounts(orgId: string): Promise<AccountRow[]> {
  const rows = await db
    .select({
      id: ledgerAccount.id,
      code: ledgerAccount.code,
      name: ledgerAccount.name,
      type: ledgerAccount.type,
      subtype: ledgerAccount.subtype,
      isActive: ledgerAccount.isActive,
    })
    .from(ledgerAccount)
    .where(eq(ledgerAccount.orgId, orgId))
    .orderBy(asc(ledgerAccount.type), asc(ledgerAccount.code), asc(ledgerAccount.name))
  return rows
}

export type NewAccount = {
  code?: string | null
  name: string
  type: AccountType
  subtype?: string | null
}

/** Upsert accounts by (orgId, name); returns a name→id map for entry import. */
export async function upsertAccounts(
  orgId: string,
  accounts: NewAccount[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  for (const a of accounts) {
    const [row] = await db
      .insert(ledgerAccount)
      .values({
        orgId,
        code: a.code ?? null,
        name: a.name,
        type: a.type,
        subtype: a.subtype ?? null,
      })
      .onConflictDoUpdate({
        target: [ledgerAccount.orgId, ledgerAccount.name],
        set: { type: a.type, subtype: a.subtype ?? null, code: a.code ?? null },
      })
      .returning({ id: ledgerAccount.id, name: ledgerAccount.name })
    map.set(row.name, row.id)
  }
  return map
}

export type NewEntry = {
  accountId: string
  date: Date
  amount: number
  description?: string | null
  party?: string | null
  category?: string | null
  sourceId?: string | null
}

export async function insertEntries(orgId: string, entries: NewEntry[]): Promise<number> {
  if (entries.length === 0) return 0
  await db.insert(ledgerEntry).values(
    entries.map((e) => ({
      orgId,
      accountId: e.accountId,
      date: e.date,
      amount: String(e.amount),
      description: e.description ?? null,
      party: e.party ?? null,
      category: e.category ?? null,
      sourceId: e.sourceId ?? null,
    }))
  )
  return entries.length
}

export type PeriodSum = { accountId: string; periodStart: Date; total: number }

/** Sum of entry amounts per (account, period bucket) over a date range. */
export async function getAccountPeriodSums(
  orgId: string,
  granularity: Granularity,
  from: Date,
  to: Date
): Promise<PeriodSum[]> {
  const g: Granularity = GRANULARITIES.includes(granularity) ? granularity : 'month'
  // Inline the (whitelisted) granularity so SELECT and GROUP BY are identical
  // expressions (a bound param gets different placeholders → Postgres rejects the
  // GROUP BY). Emit the bucket as a canonical YYYY-MM-DD string so the client
  // parses it as UTC — a bare tz-less timestamp would parse in local time and can
  // flip the month. g is validated above, so sql.raw is injection-safe.
  const trunc = sql`date_trunc('${sql.raw(g)}', ${ledgerEntry.date})`
  const rows = await db
    .select({
      accountId: ledgerEntry.accountId,
      periodStr: sql<string>`to_char(${trunc}, 'YYYY-MM-DD')`,
      total: sql<string>`sum(${ledgerEntry.amount})`,
    })
    .from(ledgerEntry)
    .where(
      and(
        eq(ledgerEntry.orgId, orgId),
        gte(ledgerEntry.date, from),
        lte(ledgerEntry.date, to)
      )
    )
    .groupBy(ledgerEntry.accountId, trunc)
  return rows.map((r) => ({
    accountId: r.accountId,
    periodStart: new Date(`${r.periodStr}T00:00:00Z`),
    total: Number(r.total),
  }))
}

/** Cumulative balance per account as of a date (for balance sheet). */
export async function getAccountBalances(
  orgId: string,
  asOf: Date
): Promise<Map<string, number>> {
  const rows = await db
    .select({
      accountId: ledgerEntry.accountId,
      total: sql<string>`sum(${ledgerEntry.amount})`,
    })
    .from(ledgerEntry)
    .where(and(eq(ledgerEntry.orgId, orgId), lte(ledgerEntry.date, asOf)))
    .groupBy(ledgerEntry.accountId)
  return new Map(rows.map((r) => [r.accountId, Number(r.total)]))
}

export type RegisterRow = {
  date: Date
  amount: number
  description: string | null
  party: string | null
}

/** Transaction register for one account over a range. */
export async function getAccountRegister(
  orgId: string,
  accountId: string,
  from: Date,
  to: Date,
  limit = 500
): Promise<RegisterRow[]> {
  const rows = await db
    .select({
      date: ledgerEntry.date,
      amount: ledgerEntry.amount,
      description: ledgerEntry.description,
      party: ledgerEntry.party,
    })
    .from(ledgerEntry)
    .where(
      and(
        eq(ledgerEntry.orgId, orgId),
        eq(ledgerEntry.accountId, accountId),
        gte(ledgerEntry.date, from),
        lte(ledgerEntry.date, to)
      )
    )
    .orderBy(desc(ledgerEntry.date))
    .limit(limit)
  return rows.map((r) => ({
    date: new Date(r.date as unknown as string),
    amount: Number(r.amount),
    description: r.description,
    party: r.party,
  }))
}

/** Distinct entry-date bounds for an org (for default report ranges). */
export async function getLedgerDateRange(
  orgId: string
): Promise<{ min: Date; max: Date } | null> {
  const [row] = await db
    .select({
      min: sql<string | null>`to_char(min(${ledgerEntry.date}), 'YYYY-MM-DD')`,
      max: sql<string | null>`to_char(max(${ledgerEntry.date}), 'YYYY-MM-DD')`,
    })
    .from(ledgerEntry)
    .where(eq(ledgerEntry.orgId, orgId))
  if (!row?.min || !row?.max) return null
  return { min: new Date(`${row.min}T00:00:00Z`), max: new Date(`${row.max}T00:00:00Z`) }
}
