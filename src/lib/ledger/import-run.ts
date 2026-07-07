import 'server-only'
import { parseAccountsCsv, parseTransactionsCsv } from './import'
import { upsertAccounts, listAccounts, insertEntries } from './store'
import { deriveMetricsFromLedger } from './metrics-bridge'
import type { AccountType } from '@/lib/reports/build'

export type ImportResult = {
  imported: number
  errors: { line: number; message: string }[]
}

/** Import a chart-of-accounts CSV (upsert by name). */
export async function importAccountsCsv(orgId: string, text: string): Promise<ImportResult> {
  const { accounts, errors } = parseAccountsCsv(text)
  if (accounts.length > 0) await upsertAccounts(orgId, accounts)
  return { imported: accounts.length, errors }
}

export type TransactionsImportResult = ImportResult & { derivedMetrics: number }

/** Import a transactions CSV, then re-derive financial KPIs. */
export async function importTransactionsCsv(
  orgId: string,
  text: string
): Promise<TransactionsImportResult> {
  const accounts = await listAccounts(orgId)
  const typeByName = new Map<string, AccountType>(accounts.map((a) => [a.name, a.type]))
  const idByName = new Map(accounts.map((a) => [a.name.toLowerCase(), a.id]))

  const { entries, errors } = parseTransactionsCsv(text, typeByName)
  const toInsert = entries
    .map((e) => {
      const accountId = idByName.get(e.accountName.toLowerCase())
      return accountId
        ? {
            accountId,
            date: e.date,
            amount: e.amount,
            description: e.description,
            party: e.party,
          }
        : null
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  const inserted = await insertEntries(orgId, toInsert)
  const derivedMetrics = inserted > 0 ? await deriveMetricsFromLedger(orgId) : 0
  return { imported: inserted, errors, derivedMetrics }
}
