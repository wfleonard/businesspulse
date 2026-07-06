import 'server-only'
import { listDefinitions, getSeries } from '@/lib/metrics/queries'
import { buildSummary, type DefLite, type OrgSummary } from './summarize'

/**
 * Build the org-scoped metric summary the Ask layer sends to Claude. This is the
 * ONLY business data the model ever sees — no raw rows, no DB access.
 */
export async function buildOrgSummary(
  orgId: string,
  orgName: string,
  now: Date = new Date()
): Promise<OrgSummary> {
  const defs = (await listDefinitions(orgId)).filter((d) => d.isActive)

  const data = await Promise.all(
    defs.map(async (d) => {
      const def: DefLite = {
        key: d.key,
        label: d.label,
        unit: d.unit,
        direction: d.direction,
        target: d.target,
      }
      const series = await getSeries(orgId, d.key, 12)
      return { def, series }
    })
  )

  return buildSummary(orgName, now, data)
}
