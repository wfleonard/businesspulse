/**
 * Dev helper: (re)seed a few alert rules for the first org so Business Watch has
 * something to evaluate. Clears existing rules first, so it's repeatable.
 * Usage: npm run dev:add-rules
 */
import 'dotenv/config'
import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })

import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { organization, alertRule } from '@/lib/db/schema'

const RULES = [
  { metricKey: 'new_estimates', condition: 'below_target', threshold: null },
  { metricKey: 'overdue_invoices', condition: 'above_target', threshold: null },
  { metricKey: 'monthly_revenue', condition: 'pct_drop', threshold: '10' },
  { metricKey: 'website_leads', condition: 'pct_rise', threshold: '10' },
]

async function main() {
  const [org] = await db.select().from(organization).limit(1)
  if (!org) throw new Error('No organization — run `npm run seed` first.')

  await db.delete(alertRule).where(eq(alertRule.orgId, org.id))
  await db.insert(alertRule).values(RULES.map((r) => ({ orgId: org.id, ...r })))

  console.log(`Seeded ${RULES.length} alert rules for "${org.name}".`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
