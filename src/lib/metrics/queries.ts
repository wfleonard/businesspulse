import 'server-only'
import { and, eq, desc, asc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { metricDefinition, metricValue } from '@/lib/db/schema'
import { computeDelta } from './period'
import type { MetricPoint, MetricSummary, MetricDirection } from './types'

export type MetricDefinitionRow = {
  key: string
  label: string
  unit: string | null
  category: string | null
  direction: MetricDirection
  target: number | null
  isActive: boolean
}

function num(v: string | null): number | null {
  if (v === null) return null
  const n = Number(v)
  return Number.isNaN(n) ? null : n
}

/** All metric definitions for an org (active first, then by label). */
export async function listDefinitions(orgId: string): Promise<MetricDefinitionRow[]> {
  const rows = await db
    .select()
    .from(metricDefinition)
    .where(eq(metricDefinition.orgId, orgId))
    .orderBy(desc(metricDefinition.isActive), asc(metricDefinition.label))

  return rows.map((r) => ({
    key: r.key,
    label: r.label,
    unit: r.unit,
    category: r.category,
    direction: r.direction,
    target: num(r.target),
    isActive: r.isActive,
  }))
}

/** Ascending time series for one metric (oldest → newest), capped at `limit`. */
export async function getSeries(
  orgId: string,
  metricKey: string,
  limit = 90
): Promise<MetricPoint[]> {
  const rows = await db
    .select({
      periodStart: metricValue.periodStart,
      periodEnd: metricValue.periodEnd,
      value: metricValue.value,
    })
    .from(metricValue)
    .where(and(eq(metricValue.orgId, orgId), eq(metricValue.metricKey, metricKey)))
    .orderBy(desc(metricValue.periodStart))
    .limit(limit)

  return rows
    .map((r) => ({
      periodStart: r.periodStart,
      periodEnd: r.periodEnd,
      value: num(r.value) ?? 0,
    }))
    .reverse()
}

/** The two most recent values for a metric (newest first). */
async function latestTwo(orgId: string, metricKey: string) {
  return db
    .select({
      periodStart: metricValue.periodStart,
      periodEnd: metricValue.periodEnd,
      value: metricValue.value,
    })
    .from(metricValue)
    .where(and(eq(metricValue.orgId, orgId), eq(metricValue.metricKey, metricKey)))
    .orderBy(desc(metricValue.periodStart))
    .limit(2)
}

/** Build the dashboard KPI summary: current value + delta vs prior period. */
export async function buildDashboardSummary(orgId: string): Promise<MetricSummary[]> {
  const defs = (await listDefinitions(orgId)).filter((d) => d.isActive)

  return Promise.all(
    defs.map(async (def) => {
      const [curr, prev] = await latestTwo(orgId, def.key)
      const current = curr ? num(curr.value) : null
      const previous = prev ? num(prev.value) : null
      return {
        key: def.key,
        label: def.label,
        unit: def.unit,
        direction: def.direction,
        current,
        previous,
        periodStart: curr?.periodStart ?? null,
        periodEnd: curr?.periodEnd ?? null,
        delta: computeDelta(current, previous, def.direction),
      } satisfies MetricSummary
    })
  )
}
