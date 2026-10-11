import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  aeoPanel,
  aeoPanelBacklog,
  aeoPanelVersion,
  aeoResult,
  aeoRun,
  type AeoPanelDraft,
} from '@/lib/db/schema'
import { contentKey, describeChange, type PanelContent, type PanelRunRow } from './panel-content'

/**
 * Dashboard reads and writes for panels and the panel backlog. The database is
 * the source of truth for panels: an edit here bumps the version and records
 * it in aeo_panel_version, and `npm run aeo:panels` no longer touches the panel.
 */

type Db = typeof db
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

export type PanelListRow = {
  slug: string
  name: string
  version: number
  isActive: boolean
  questionCount: number
  editedAt: Date | null
  updatedAt: Date
  runs: number
  runs30d: number
  lastRunAt: Date | null
}

export async function listPanels(): Promise<PanelListRow[]> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const runCounts = db
    .select({
      slug: aeoRun.panelSlug,
      runs: sql<number>`count(*)::int`.as('runs'),
      runs30d: sql<number>`count(*) filter (where ${aeoRun.createdAt} >= ${since})::int`.as('runs30d'),
      lastRunAt: sql<Date | null>`max(${aeoRun.createdAt})`.as('last_run_at'),
    })
    .from(aeoRun)
    .where(and(eq(aeoRun.panelSource, 'canned'), eq(aeoRun.status, 'done')))
    .groupBy(aeoRun.panelSlug)
    .as('run_counts')

  const rows = await db
    .select({
      slug: aeoPanel.slug,
      name: aeoPanel.name,
      version: aeoPanel.version,
      isActive: aeoPanel.isActive,
      questionCount: sql<number>`jsonb_array_length(${aeoPanel.questions})::int`,
      editedAt: aeoPanel.editedAt,
      updatedAt: aeoPanel.updatedAt,
      runs: runCounts.runs,
      runs30d: runCounts.runs30d,
      lastRunAt: runCounts.lastRunAt,
    })
    .from(aeoPanel)
    .leftJoin(runCounts, eq(runCounts.slug, aeoPanel.slug))
    .orderBy(asc(aeoPanel.name))

  return rows.map((row) => ({
    ...row,
    runs: row.runs ?? 0,
    runs30d: row.runs30d ?? 0,
    lastRunAt: row.lastRunAt ? new Date(row.lastRunAt) : null,
  }))
}

export async function getPanel(slug: string) {
  const [panel] = await db.select().from(aeoPanel).where(eq(aeoPanel.slug, slug)).limit(1)
  return panel ?? null
}

export async function listPanelVersions(panelId: string) {
  const versions = await db
    .select()
    .from(aeoPanelVersion)
    .where(eq(aeoPanelVersion.panelId, panelId))
    .orderBy(asc(aeoPanelVersion.version))
  return versions
    .map((v, i) => ({ ...v, change: describeChange(i > 0 ? versions[i - 1] : null, v) }))
    .reverse()
}

/** Runs the suggestions read: the most recent finished runs of this panel, any version. */
const SUGGESTION_RUN_LIMIT = 200

export async function panelRunRows(slug: string): Promise<PanelRunRow[]> {
  const recentRuns = db
    .select({ id: aeoRun.id })
    .from(aeoRun)
    .where(and(eq(aeoRun.panelSource, 'canned'), eq(aeoRun.panelSlug, slug), eq(aeoRun.status, 'done')))
    .orderBy(desc(aeoRun.createdAt))
    .limit(SUGGESTION_RUN_LIMIT)

  return db
    .select({
      runId: aeoRun.id,
      domain: aeoRun.domain,
      otherDomains: aeoRun.otherDomains,
      query: aeoResult.query,
      ownCited: aeoResult.ownCited,
      rivals: aeoResult.rivals,
      error: aeoResult.error,
    })
    .from(aeoResult)
    .innerJoin(aeoRun, eq(aeoResult.runId, aeoRun.id))
    .where(inArray(aeoResult.runId, recentRuns))
}

export class StalePanelError extends Error {
  constructor() {
    super('The panel changed since this page was loaded. Reload and try again.')
    this.name = 'StalePanelError'
  }
}

/**
 * Record a version row for the panel as it stands. Does nothing if that version
 * is already recorded, so it is safe to call before every edit.
 */
export async function recordCurrentVersion(
  tx: Tx | Db,
  panel: typeof aeoPanel.$inferSelect,
  note: string,
  userId: string | null = null
): Promise<void> {
  await tx
    .insert(aeoPanelVersion)
    .values({
      panelId: panel.id,
      version: panel.version,
      name: panel.name,
      questions: panel.questions,
      directoryDomains: panel.directoryDomains,
      referenceDomains: panel.referenceDomains,
      note,
      userId,
    })
    .onConflictDoNothing()
}

/**
 * Save new content as the next version. `expectedVersion` is the version the
 * editor saw; if someone saved in between, nothing is written.
 * Returns the new version, or null when the content didn't change.
 */
export async function savePanelEdit(params: {
  slug: string
  expectedVersion: number
  content: PanelContent
  note: string
  userId: string
}): Promise<number | null> {
  return db.transaction(async (tx) => {
    const [panel] = await tx.select().from(aeoPanel).where(eq(aeoPanel.slug, params.slug)).for('update').limit(1)
    if (!panel) throw new Error(`No panel ${params.slug}`)
    if (panel.version !== params.expectedVersion) throw new StalePanelError()
    if (contentKey(panel) === contentKey(params.content)) return null

    await recordCurrentVersion(tx, panel, panel.editedAt ? '' : 'From code, before dashboard edits')
    const version = panel.version + 1
    const now = new Date()
    const [updated] = await tx
      .update(aeoPanel)
      .set({ ...params.content, version, editedAt: now, updatedAt: now })
      .where(eq(aeoPanel.id, panel.id))
      .returning()
    await recordCurrentVersion(tx, updated, params.note, params.userId)
    return version
  })
}

export async function setPanelActive(slug: string, isActive: boolean): Promise<boolean> {
  const rows = await db
    .update(aeoPanel)
    .set({ isActive, editedAt: sql`coalesce(${aeoPanel.editedAt}, now())`, updatedAt: new Date() })
    .where(eq(aeoPanel.slug, slug))
    .returning({ id: aeoPanel.id })
  return rows.length > 0
}

/** Set hosts aside from the suggestions. Not panel content, so no new version. */
export async function dismissDomains(slug: string, hosts: string[]): Promise<void> {
  if (hosts.length === 0) return
  await db
    .update(aeoPanel)
    .set({
      dismissedDomains: sql`(select coalesce(jsonb_agg(distinct d), '[]'::jsonb) from jsonb_array_elements_text(${aeoPanel.dismissedDomains} || ${JSON.stringify(hosts)}::jsonb) as d)`,
    })
    .where(eq(aeoPanel.slug, slug))
}

/* ------------------------------------------------------------------ */
/* Backlog                                                             */
/* ------------------------------------------------------------------ */

export type BacklogRow = typeof aeoPanelBacklog.$inferSelect & { live: boolean }

export async function listBacklog(): Promise<BacklogRow[]> {
  const rows = await db
    .select({ entry: aeoPanelBacklog, panelId: aeoPanel.id })
    .from(aeoPanelBacklog)
    .leftJoin(aeoPanel, eq(aeoPanel.slug, aeoPanelBacklog.slug))
    .orderBy(asc(aeoPanelBacklog.rank))
  return rows.map(({ entry, panelId }) => ({ ...entry, live: panelId !== null }))
}

export async function getBacklogEntry(slug: string): Promise<BacklogRow | null> {
  const [row] = await db
    .select({ entry: aeoPanelBacklog, panelId: aeoPanel.id })
    .from(aeoPanelBacklog)
    .leftJoin(aeoPanel, eq(aeoPanel.slug, aeoPanelBacklog.slug))
    .where(eq(aeoPanelBacklog.slug, slug))
    .limit(1)
  return row ? { ...row.entry, live: row.panelId !== null } : null
}

export async function updateBacklogEntry(
  slug: string,
  values: Partial<Pick<typeof aeoPanelBacklog.$inferInsert, 'guidance' | 'status' | 'draft' | 'rank'>>
): Promise<void> {
  await db
    .update(aeoPanelBacklog)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(aeoPanelBacklog.slug, slug))
}

export async function saveBacklogDraft(slug: string, guidance: string, draft: AeoPanelDraft): Promise<void> {
  await updateBacklogEntry(slug, { guidance, draft, status: 'drafted' })
}

/** Publish a reviewed draft as a new live panel, version 1. */
export async function publishBacklogPanel(slug: string, content: PanelContent, userId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const now = new Date()
    const [panel] = await tx
      .insert(aeoPanel)
      .values({ slug, ...content, version: 1, isActive: true, editedAt: now })
      .returning()
    await recordCurrentVersion(tx, panel, 'Drafted by Claude, published from the backlog', userId)
    await tx
      .update(aeoPanelBacklog)
      .set({ status: 'drafted', updatedAt: now })
      .where(eq(aeoPanelBacklog.slug, slug))
  })
}

