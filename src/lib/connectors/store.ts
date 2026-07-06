import 'server-only'
import { and, eq, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { dataSource } from '@/lib/db/schema'
import { encryptSecret, decryptSecret } from '@/lib/crypto'
import { apiConnectorConfigSchema, type ApiConnectorConfig } from './config'

/** Public (secret-free) view of a data source for listing in the UI. */
export type SourceSummary = {
  id: string
  name: string
  kind: 'manual' | 'csv' | 'api'
  status: 'active' | 'paused' | 'error'
  lastSyncedAt: Date | null
  lastError: string | null
}

export async function listSources(orgId: string): Promise<SourceSummary[]> {
  const rows = await db
    .select({
      id: dataSource.id,
      name: dataSource.name,
      kind: dataSource.kind,
      status: dataSource.status,
      lastSyncedAt: dataSource.lastSyncedAt,
      lastError: dataSource.lastError,
    })
    .from(dataSource)
    .where(eq(dataSource.orgId, orgId))
    .orderBy(desc(dataSource.createdAt))
  return rows
}

export async function createApiSource(
  orgId: string,
  name: string,
  config: ApiConnectorConfig
): Promise<string> {
  const [row] = await db
    .insert(dataSource)
    .values({
      orgId,
      kind: 'api',
      name,
      status: 'active',
      configEncrypted: encryptSecret(JSON.stringify(config)),
    })
    .returning({ id: dataSource.id })
  return row.id
}

/** Server-only: fetch a source and its decrypted, re-validated config. */
export async function getSourceWithConfig(
  orgId: string,
  id: string
): Promise<{ id: string; name: string; config: ApiConnectorConfig } | null> {
  const [row] = await db
    .select()
    .from(dataSource)
    .where(and(eq(dataSource.orgId, orgId), eq(dataSource.id, id)))
    .limit(1)
  if (!row || row.kind !== 'api' || !row.configEncrypted) return null

  const parsed = apiConnectorConfigSchema.safeParse(
    JSON.parse(decryptSecret(row.configEncrypted))
  )
  if (!parsed.success) return null
  return { id: row.id, name: row.name, config: parsed.data }
}

/** Server-only: all active API sources for an org (with decrypted config). */
export async function listActiveApiSources(
  orgId: string
): Promise<{ id: string; name: string; config: ApiConnectorConfig }[]> {
  const rows = await db
    .select()
    .from(dataSource)
    .where(and(eq(dataSource.orgId, orgId), eq(dataSource.kind, 'api'), eq(dataSource.status, 'active')))
  const out: { id: string; name: string; config: ApiConnectorConfig }[] = []
  for (const row of rows) {
    if (!row.configEncrypted) continue
    const parsed = apiConnectorConfigSchema.safeParse(
      JSON.parse(decryptSecret(row.configEncrypted))
    )
    if (parsed.success) out.push({ id: row.id, name: row.name, config: parsed.data })
  }
  return out
}

/** Server-only: all active API sources across every org (for the cron job). */
export async function listAllActiveApiSources(): Promise<
  { id: string; orgId: string; name: string; config: ApiConnectorConfig }[]
> {
  const rows = await db
    .select()
    .from(dataSource)
    .where(and(eq(dataSource.kind, 'api'), eq(dataSource.status, 'active')))
  const out: { id: string; orgId: string; name: string; config: ApiConnectorConfig }[] = []
  for (const row of rows) {
    if (!row.configEncrypted) continue
    const parsed = apiConnectorConfigSchema.safeParse(
      JSON.parse(decryptSecret(row.configEncrypted))
    )
    if (parsed.success)
      out.push({ id: row.id, orgId: row.orgId, name: row.name, config: parsed.data })
  }
  return out
}

export async function updateSyncResult(
  id: string,
  result: { lastError: string | null; status: 'active' | 'error' }
): Promise<void> {
  await db
    .update(dataSource)
    .set({
      lastSyncedAt: new Date(),
      lastError: result.lastError,
      status: result.status,
      updatedAt: new Date(),
    })
    .where(eq(dataSource.id, id))
}

export async function deleteSource(orgId: string, id: string): Promise<void> {
  await db.delete(dataSource).where(and(eq(dataSource.orgId, orgId), eq(dataSource.id, id)))
}
