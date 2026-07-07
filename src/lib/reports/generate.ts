import 'server-only'
import {
  listAccounts,
  getAccountPeriodSums,
  getAccountBalances,
  getAccountRegister,
  getLedgerDateRange,
  type Granularity,
} from '@/lib/ledger/store'
import { generatePeriods } from './period'
import {
  buildProfitAndLoss,
  buildBalanceSheet,
  buildCashMovement,
  buildPayroll,
} from './build'

/** Default report window: the ledger's own date span, else the last 12 months. */
export async function defaultRange(orgId: string): Promise<{ from: Date; to: Date }> {
  const r = await getLedgerDateRange(orgId)
  if (r) return { from: r.min, to: r.max }
  const to = new Date()
  const from = new Date(Date.UTC(to.getUTCFullYear() - 1, to.getUTCMonth(), 1))
  return { from, to }
}

export async function getProfitAndLoss(orgId: string, g: Granularity, from: Date, to: Date) {
  const [accounts, sums] = await Promise.all([
    listAccounts(orgId),
    getAccountPeriodSums(orgId, g, from, to),
  ])
  return buildProfitAndLoss(accounts, sums, generatePeriods(from, to, g), g)
}

export async function getBalanceSheet(orgId: string, asOf: Date) {
  const [accounts, balances] = await Promise.all([
    listAccounts(orgId),
    getAccountBalances(orgId, asOf),
  ])
  return buildBalanceSheet(accounts, balances, asOf)
}

export async function getCashMovement(orgId: string, g: Granularity, from: Date, to: Date) {
  const [accounts, sums] = await Promise.all([
    listAccounts(orgId),
    getAccountPeriodSums(orgId, g, from, to),
  ])
  return buildCashMovement(accounts, sums, generatePeriods(from, to, g), g)
}

export async function getPayroll(orgId: string, g: Granularity, from: Date, to: Date) {
  const [accounts, sums] = await Promise.all([
    listAccounts(orgId),
    getAccountPeriodSums(orgId, g, from, to),
  ])
  return buildPayroll(accounts, sums, generatePeriods(from, to, g), g)
}

export async function getRegister(orgId: string, accountId: string, from: Date, to: Date) {
  const accounts = await listAccounts(orgId)
  const account = accounts.find((a) => a.id === accountId) ?? null
  const rows = account ? await getAccountRegister(orgId, accountId, from, to) : []
  return { account, rows }
}
