import 'server-only'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { metricDefinition, metricValue } from '@/lib/db/schema'
import type { MetricCsvRow } from './csv'
import type { MetricDirection } from './types'

export type NewDefinition = {
  key: string
  label: string
  unit?: string | null
  category?: string | null
  direction: MetricDirection
  target?: number | null
}

/** Create a metric definition, or update label/unit/etc. if the key exists. */
export async function upsertDefinition(orgId: string, def: NewDefinition): Promise<void> {
  await db
    .insert(metricDefinition)
    .values({
      orgId,
      key: def.key,
      label: def.label,
      unit: def.unit ?? null,
      category: def.category ?? null,
      direction: def.direction,
      target: def.target != null ? String(def.target) : null,
    })
    .onConflictDoUpdate({
      target: [metricDefinition.orgId, metricDefinition.key],
      set: {
        label: def.label,
        unit: def.unit ?? null,
        category: def.category ?? null,
        direction: def.direction,
        target: def.target != null ? String(def.target) : null,
      },
    })
}

export type NewValue = {
  metricKey: string
  periodStart: Date
  periodEnd: Date
  value: number
  dimensions?: Record<string, string>
  sourceId?: string | null
}

/** Insert a single metric value. */
export async function recordValue(orgId: string, v: NewValue): Promise<void> {
  await db.insert(metricValue).values({
    orgId,
    metricKey: v.metricKey,
    periodStart: v.periodStart,
    periodEnd: v.periodEnd,
    value: String(v.value),
    dimensions: v.dimensions ?? {},
    sourceId: v.sourceId ?? null,
  })
}

/** Bulk insert parsed CSV rows. Returns count inserted. */
export async function importRows(
  orgId: string,
  rows: MetricCsvRow[],
  sourceId?: string | null
): Promise<number> {
  if (rows.length === 0) return 0
  await db.insert(metricValue).values(
    rows.map((r) => ({
      orgId,
      metricKey: r.metricKey,
      periodStart: r.periodStart,
      periodEnd: r.periodEnd,
      value: String(r.value),
      dimensions: r.dimensions,
      sourceId: sourceId ?? null,
    }))
  )
  return rows.length
}

/** Distinct metric keys that have values but no definition yet. */
export async function keysMissingDefinition(orgId: string): Promise<string[]> {
  const values = await db
    .selectDistinct({ key: metricValue.metricKey })
    .from(metricValue)
    .where(eq(metricValue.orgId, orgId))
  const defs = await db
    .select({ key: metricDefinition.key })
    .from(metricDefinition)
    .where(eq(metricDefinition.orgId, orgId))
  const defined = new Set(defs.map((d) => d.key))
  return values.map((v) => v.key).filter((k) => !defined.has(k))
}

/** Toggle a definition's active flag. */
export async function setDefinitionActive(
  orgId: string,
  key: string,
  isActive: boolean
): Promise<void> {
  await db
    .update(metricDefinition)
    .set({ isActive })
    .where(and(eq(metricDefinition.orgId, orgId), eq(metricDefinition.key, key)))
}
