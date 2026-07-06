import 'server-only'
import { and, eq, gte, lte, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { metricDefinition, metricValue } from '@/lib/db/schema'
import { runApiConnector } from './api-connector'
import {
  getSourceWithConfig,
  listActiveApiSources,
  listAllActiveApiSources,
  updateSyncResult,
} from './store'
import type { ApiConnectorConfig, NormalizedValue } from './config'

export type SyncSummary = {
  sourceId: string
  name: string
  inserted: number
  errors: string[]
  ok: boolean
}

/** Create a basic definition for any incoming metric key that has none yet. */
async function ensureDefinitions(orgId: string, keys: string[]): Promise<void> {
  if (keys.length === 0) return
  const existing = await db
    .select({ key: metricDefinition.key })
    .from(metricDefinition)
    .where(and(eq(metricDefinition.orgId, orgId), inArray(metricDefinition.key, keys)))
  const have = new Set(existing.map((e) => e.key))
  const missing = keys.filter((k) => !have.has(k))
  if (missing.length === 0) return

  await db.insert(metricDefinition).values(
    missing.map((key) => ({
      orgId,
      key,
      label: key
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' '),
      direction: 'up_good' as const,
    }))
  )
}

/**
 * Persist normalized values idempotently: for each metric key, replace this
 * source's rows within the fetched period window [min, max], then insert. This
 * keeps re-syncs from duplicating rows while preserving history outside the
 * returned window and never touching manual/other-source rows.
 */
async function persistValues(
  orgId: string,
  sourceId: string,
  values: NormalizedValue[]
): Promise<number> {
  if (values.length === 0) return 0

  const byKey = new Map<string, NormalizedValue[]>()
  for (const v of values) {
    const arr = byKey.get(v.metricKey) ?? []
    arr.push(v)
    byKey.set(v.metricKey, arr)
  }

  await ensureDefinitions(orgId, [...byKey.keys()])

  let inserted = 0
  for (const [key, rows] of byKey) {
    const starts = rows.map((r) => r.periodStart.getTime())
    const min = new Date(Math.min(...starts))
    const max = new Date(Math.max(...starts))

    await db
      .delete(metricValue)
      .where(
        and(
          eq(metricValue.orgId, orgId),
          eq(metricValue.sourceId, sourceId),
          eq(metricValue.metricKey, key),
          gte(metricValue.periodStart, min),
          lte(metricValue.periodStart, max)
        )
      )

    await db.insert(metricValue).values(
      rows.map((r) => ({
        orgId,
        metricKey: r.metricKey,
        periodStart: r.periodStart,
        periodEnd: r.periodEnd,
        value: String(r.value),
        dimensions: r.dimensions,
        sourceId,
      }))
    )
    inserted += rows.length
  }
  return inserted
}

/** Run one source's connector and persist the result. */
export async function syncSource(
  orgId: string,
  source: { id: string; name: string; config: ApiConnectorConfig }
): Promise<SyncSummary> {
  try {
    const { values, errors } = await runApiConnector(source.config)
    const inserted = await persistValues(orgId, source.id, values)
    const hardFail = inserted === 0 && errors.length > 0
    await updateSyncResult(source.id, {
      lastError: errors.length ? errors.slice(0, 5).join('; ') : null,
      status: hardFail ? 'error' : 'active',
    })
    return { sourceId: source.id, name: source.name, inserted, errors, ok: !hardFail }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await updateSyncResult(source.id, { lastError: message, status: 'error' })
    return { sourceId: source.id, name: source.name, inserted: 0, errors: [message], ok: false }
  }
}

/** Sync a single source by id (org-scoped). */
export async function syncSourceById(orgId: string, id: string): Promise<SyncSummary | null> {
  const source = await getSourceWithConfig(orgId, id)
  if (!source) return null
  return syncSource(orgId, source)
}

/** Sync every active API source for an org. */
export async function syncActiveSources(orgId: string): Promise<SyncSummary[]> {
  const sources = await listActiveApiSources(orgId)
  const out: SyncSummary[] = []
  for (const s of sources) out.push(await syncSource(orgId, s))
  return out
}

/** Sync every active API source across all orgs (used by the cron trigger). */
export async function syncAllActiveSources(): Promise<SyncSummary[]> {
  const sources = await listAllActiveApiSources()
  const out: SyncSummary[] = []
  for (const s of sources) out.push(await syncSource(s.orgId, s))
  return out
}
