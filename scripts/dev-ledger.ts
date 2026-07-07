/**
 * Dev helper: load a sample chart of accounts + a half-year of transactions for
 * the first org, so the Reports pages have data. Repeatable (clears first).
 * Usage: npm run dev:ledger
 */
import 'dotenv/config'
import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })

import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { organization, ledgerAccount, ledgerEntry } from '@/lib/db/schema'

const ACCOUNTS = [
  { name: 'Sales Revenue', type: 'income' as const, subtype: null, code: '4000' },
  { name: 'Cost of Goods Sold', type: 'expense' as const, subtype: 'cogs', code: '5000' },
  { name: 'Rent', type: 'expense' as const, subtype: null, code: '6100' },
  { name: 'Wages & Salaries', type: 'expense' as const, subtype: 'payroll', code: '6200' },
  { name: 'Software Subscriptions', type: 'expense' as const, subtype: null, code: '6300' },
  { name: 'Business Checking', type: 'asset' as const, subtype: 'bank', code: '1000' },
  { name: "Owner's Equity", type: 'equity' as const, subtype: null, code: '3000' },
]

const MONTHS = ['01', '02', '03', '04', '05', '06']
const REVENUE = [20000, 22000, 25000, 24000, 28000, 30000]
const COGS = [6000, 6500, 7500, 7000, 8000, 8500]
const RENT = [2500, 2500, 2500, 2500, 2500, 2500]
const WAGES = [5000, 5000, 5500, 5500, 6000, 6000]
const SOFTWARE = [800, 800, 800, 900, 900, 900]

async function main() {
  const [org] = await db.select().from(organization).limit(1)
  if (!org) throw new Error('No organization — run `npm run seed` first.')

  await db.delete(ledgerEntry).where(eq(ledgerEntry.orgId, org.id))
  await db.delete(ledgerAccount).where(eq(ledgerAccount.orgId, org.id))

  const idByName = new Map<string, string>()
  for (const a of ACCOUNTS) {
    const [row] = await db
      .insert(ledgerAccount)
      .values({ orgId: org.id, name: a.name, type: a.type, subtype: a.subtype, code: a.code })
      .returning({ id: ledgerAccount.id, name: ledgerAccount.name })
    idByName.set(row.name, row.id)
  }

  const entries: (typeof ledgerEntry.$inferInsert)[] = []
  const post = (name: string, date: Date, amount: number, desc: string) =>
    entries.push({ orgId: org.id, accountId: idByName.get(name)!, date, amount: String(amount), description: desc })

  MONTHS.forEach((mm, i) => {
    const d = new Date(`2026-${mm}-15T00:00:00Z`)
    const rev = REVENUE[i], cogs = COGS[i], rent = RENT[i], wages = WAGES[i], sw = SOFTWARE[i]
    post('Sales Revenue', d, rev, 'Monthly sales')
    post('Business Checking', d, rev, 'Deposits')
    post('Cost of Goods Sold', d, cogs, 'COGS')
    post('Business Checking', d, -cogs, 'COGS paid')
    post('Rent', d, rent, 'Office rent')
    post('Business Checking', d, -rent, 'Rent paid')
    post('Wages & Salaries', d, wages, 'Payroll')
    post('Business Checking', d, -wages, 'Payroll paid')
    post('Software Subscriptions', d, sw, 'SaaS tools')
    post('Business Checking', d, -sw, 'SaaS paid')
  })

  await db.insert(ledgerEntry).values(entries)
  console.log(`Loaded ${ACCOUNTS.length} accounts + ${entries.length} ledger entries for "${org.name}".`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
