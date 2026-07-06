/**
 * Dev-only: load a few sample metrics + monthly values for the first org so the
 * dashboard has something to show. Safe to re-run (definitions upsert; values
 * append). Usage: npm run sample
 */
import 'dotenv/config'
import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })

import { db } from '@/lib/db'
import { organization, metricDefinition, metricValue } from '@/lib/db/schema'

const MONTHS = [
  ['2026-01-01', '2026-01-31'],
  ['2026-02-01', '2026-02-28'],
  ['2026-03-01', '2026-03-31'],
  ['2026-04-01', '2026-04-30'],
  ['2026-05-01', '2026-05-31'],
  ['2026-06-01', '2026-06-30'],
] as const

const METRICS = [
  {
    key: 'monthly_revenue',
    label: 'Monthly Revenue',
    unit: '$',
    category: 'Revenue',
    direction: 'up_good' as const,
    target: 120000,
    values: [98000, 102000, 110000, 105000, 118000, 121000],
  },
  {
    key: 'new_estimates',
    label: 'New Estimates',
    unit: null,
    category: 'Sales',
    direction: 'up_good' as const,
    target: 45,
    values: [40, 38, 45, 30, 33, 28],
  },
  {
    key: 'overdue_invoices',
    label: 'Overdue Invoices',
    unit: '$',
    category: 'Cash Flow',
    direction: 'down_good' as const,
    target: 10000,
    values: [12000, 15000, 9000, 18000, 22000, 16000],
  },
]

async function main() {
  const [org] = await db.select().from(organization).limit(1)
  if (!org) throw new Error('No organization found — run `npm run seed` first.')

  for (const m of METRICS) {
    await db
      .insert(metricDefinition)
      .values({
        orgId: org.id,
        key: m.key,
        label: m.label,
        unit: m.unit,
        category: m.category,
        direction: m.direction,
        target: String(m.target),
      })
      .onConflictDoUpdate({
        target: [metricDefinition.orgId, metricDefinition.key],
        set: { label: m.label, unit: m.unit, direction: m.direction },
      })

    await db.insert(metricValue).values(
      MONTHS.map(([start, end], i) => ({
        orgId: org.id,
        metricKey: m.key,
        periodStart: new Date(start),
        periodEnd: new Date(end),
        value: String(m.values[i]),
      }))
    )
  }
  console.log(`Loaded ${METRICS.length} metrics × ${MONTHS.length} months for "${org.name}".`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
