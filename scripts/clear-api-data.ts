/**
 * Remove data pulled by API sources so you can start fresh.
 *
 * Why this is needed: metric_value.source_id is ON DELETE SET NULL, so deleting
 * an API source *orphans* the rows it pulled (source_id -> null) instead of
 * removing them. Re-testing then leaves duplicate/stale rows behind.
 *
 * This purges by metric KEY, which catches both still-linked rows and orphans:
 *   - deletes every API-kind data source
 *   - deletes all metric_values for any metric_key an API source produced
 *   - deletes the metric_definitions for those keys (clean Metrics list)
 * Manual/CSV metrics and ledger-derived KPIs (different keys) are untouched.
 *
 * Run in the tools container on the node:
 *   docker compose -f docker-compose.prod.yml --profile tools run --rm \
 *     migrate npm run clear:api-data
 *
 * Preview first (no changes):        ... npm run clear:api-data -- --dry-run
 * Also purge orphan keys by hand:    ... npm run clear:api-data -- campaigns_sent
 * (use the positional keys when every API source is already gone and there's
 *  nothing left to infer the key from)
 */
import 'dotenv/config'
import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })

import { inArray, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { dataSource, metricValue, metricDefinition } from '@/lib/db/schema'

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const extraKeys = args.filter((a) => !a.startsWith('--'))

  // 1. Existing API-kind sources.
  const apiSources = await db
    .select({ id: dataSource.id, name: dataSource.name })
    .from(dataSource)
    .where(eq(dataSource.kind, 'api'))
  const apiSourceIds = apiSources.map((s) => s.id)

  // 2. Metric keys those sources produced (still-linked rows), plus any passed in.
  const keyRows = apiSourceIds.length
    ? await db
        .selectDistinct({ key: metricValue.metricKey })
        .from(metricValue)
        .where(inArray(metricValue.sourceId, apiSourceIds))
    : []
  const keys = Array.from(new Set([...keyRows.map((r) => r.key), ...extraKeys]))

  if (apiSources.length === 0 && keys.length === 0) {
    console.log('Nothing to do: no API sources found and no metric keys given.')
    console.log('If orphaned rows remain, pass the key(s) explicitly, e.g.:')
    console.log('  npm run clear:api-data -- campaigns_sent')
    process.exit(0)
  }

  const [{ n: valueCount }] = keys.length
    ? await db
        .select({ n: sql<number>`count(*)::int` })
        .from(metricValue)
        .where(inArray(metricValue.metricKey, keys))
    : [{ n: 0 }]

  console.log(
    `API sources: ${apiSources.length}` +
      (apiSources.length ? ` (${apiSources.map((s) => s.name).join(', ')})` : '')
  )
  console.log(`Metric keys to purge: ${keys.length ? keys.join(', ') : '(none)'}`)
  console.log(`metric_value rows to delete: ${valueCount}`)

  if (dryRun) {
    console.log('\n--dry-run: no changes made.')
    process.exit(0)
  }

  // 3. Delete values by key (linked + orphaned), then their definitions, then sources.
  if (keys.length) {
    await db.delete(metricValue).where(inArray(metricValue.metricKey, keys))
    await db.delete(metricDefinition).where(inArray(metricDefinition.key, keys))
  }
  if (apiSourceIds.length) {
    await db.delete(dataSource).where(inArray(dataSource.id, apiSourceIds))
  }

  console.log('\nDone. API data cleared — create one clean source and Sync now.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
