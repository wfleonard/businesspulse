/**
 * Dev helper: register an API data source pointing at the built-in mock
 * endpoint, so you can test the connector without an external API.
 * Usage: npm run dev:add-source
 */
import 'dotenv/config'
import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })

import { db } from '@/lib/db'
import { organization, dataSource } from '@/lib/db/schema'
import { encryptSecret } from '@/lib/crypto'
import { apiConnectorConfigSchema } from '@/lib/connectors/config'

async function main() {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3400'
  const cfg = apiConnectorConfigSchema.parse({
    baseUrl: base,
    auth: { type: 'none' },
    endpoints: [
      {
        path: '/api/dev/mock-metrics',
        rowsPath: 'data',
        mappings: [
          {
            metricKey: 'website_leads',
            valuePath: 'leads',
            periodStartPath: 'month_start',
            periodEndPath: 'month_end',
          },
          {
            metricKey: 'ad_spend',
            valuePath: 'ad_spend',
            periodStartPath: 'month_start',
            periodEndPath: 'month_end',
          },
        ],
      },
    ],
  })

  const [org] = await db.select().from(organization).limit(1)
  if (!org) throw new Error('No organization — run `npm run seed` first.')

  const [row] = await db
    .insert(dataSource)
    .values({
      orgId: org.id,
      kind: 'api',
      name: 'Mock Marketing API',
      status: 'active',
      configEncrypted: encryptSecret(JSON.stringify(cfg)),
    })
    .returning({ id: dataSource.id })

  console.log(`Created API source ${row.id} for "${org.name}" -> ${base}/api/dev/mock-metrics`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
