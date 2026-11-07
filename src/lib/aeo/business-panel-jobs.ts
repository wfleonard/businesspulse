import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { aeoPanel, business, businessBrief, businessPanel, type BusinessPanelQuestion } from '@/lib/db/schema'
import { sendEmail } from '@/lib/email/provider'
import { adminPanelDraftEmail } from '@/lib/access/emails'
import { BusinessPanelError, draftBusinessPanel, type PanelCall } from './business-panel'
import { fillSlots } from './questions'
import { stateInfo } from './states'

/**
 * Business panel versions as worker jobs and admin actions
 * (docs/business-panel-plan.md). Confirming a brief queues a draft; the
 * snapshot worker writes it; the admin edits and approves it. Only the
 * approved version is asked by Pulse runs, and approving one retires the last.
 */

const MAX_PANEL_ATTEMPTS = 2
const PANEL_LEASE_SECONDS = 900

export type PanelQueueResult = 'queued' | 'in_progress' | 'no_brief'

/** Queue a new draft version from the business's confirmed brief. Older unapproved drafts are retired. */
export async function queuePanelDraft(businessId: string): Promise<PanelQueueResult> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`business_panel:${businessId}`}))`)
    const [brief] = await tx
      .select({ status: businessBrief.status })
      .from(businessBrief)
      .where(eq(businessBrief.businessId, businessId))
      .limit(1)
    if (brief?.status !== 'confirmed') return 'no_brief'

    const versions = await tx
      .select({ id: businessPanel.id, version: businessPanel.version, status: businessPanel.status })
      .from(businessPanel)
      .where(eq(businessPanel.businessId, businessId))
      .orderBy(desc(businessPanel.version))
    if (versions.some((v) => v.status === 'queued' || v.status === 'drafting')) return 'in_progress'

    const stale = versions.filter((v) => v.status === 'draft' || v.status === 'failed').map((v) => v.id)
    if (stale.length) {
      await tx.update(businessPanel).set({ status: 'retired', updatedAt: new Date() }).where(inArray(businessPanel.id, stale))
    }
    await tx.insert(businessPanel).values({ businessId, version: (versions[0]?.version ?? 0) + 1 })
    return 'queued'
  })
}

export async function panelDraftSpentTodayUsd(): Promise<number> {
  const result = await db.execute<{ spent: number }>(sql`
    select coalesce(sum(cost_usd), 0)::float8 as spent from business_panel
    where updated_at >= date_trunc('day', now())
  `)
  return Number(result.rows[0]?.spent ?? 0)
}

export type ClaimedPanel = { id: string; businessId: string; version: number; attempts: number; leaseToken: string }

export async function claimNextPanelDraft(): Promise<ClaimedPanel | null> {
  const result = await db.execute<{ id: string; business_id: string; version: number; attempts: number; lease_token: string }>(sql`
    update business_panel
    set status = 'drafting', attempts = attempts + 1, locked_at = now(), lease_token = gen_random_uuid(), updated_at = now()
    where id = (
      select id from business_panel
      where attempts < ${MAX_PANEL_ATTEMPTS}::int
        and (status = 'queued'
          or (status = 'drafting' and locked_at < now() - ${PANEL_LEASE_SECONDS}::int * interval '1 second'))
      order by created_at
      for update skip locked
      limit 1
    )
    returning id, business_id, version, attempts, lease_token
  `)
  const row = result.rows[0]
  return row
    ? { id: row.id, businessId: row.business_id, version: Number(row.version), attempts: Number(row.attempts), leaseToken: row.lease_token }
    : null
}

export async function sweepAbandonedPanelDrafts(): Promise<number> {
  const result = await db.execute(sql`
    update business_panel
    set status = 'failed', error = 'the worker stopped responding', lease_token = null, locked_at = null, updated_at = now()
    where status = 'drafting' and attempts >= ${MAX_PANEL_ATTEMPTS}::int
      and locked_at < now() - ${PANEL_LEASE_SECONDS}::int * interval '1 second'
    returning id
  `)
  return result.rows.length
}

export type PanelJobOutcome = { status: 'draft' | 'queued' | 'failed' | 'lost'; costUsd: number; questions: number; error?: string }

/** Draft a business panel from the confirmed brief and the matching industry panels. */
export async function processPanelDraft(
  job: ClaimedPanel,
  options: { model: string; call?: PanelCall; send?: typeof sendEmail }
): Promise<PanelJobOutcome> {
  const [row] = await db
    .select({ business, brief: businessBrief })
    .from(business)
    .innerJoin(businessBrief, eq(businessBrief.businessId, business.id))
    .where(eq(business.id, job.businessId))
    .limit(1)
  if (!row || !row.brief.brief || !row.brief.confirmed) {
    await failJob(job, 'the brief is no longer confirmed', 0, true)
    return { status: 'failed', costUsd: 0, questions: 0, error: 'no confirmed brief' }
  }
  const { business: biz } = row
  const { brief, confirmed } = row.brief
  const state = stateInfo(biz.state)

  // The library: industry panels the brief matched, filled for this business. Falls back to the profile's panel.
  const slugs = brief.industryPanels.length ? brief.industryPanels.map((p) => p.slug) : biz.panelSlug ? [biz.panelSlug] : []
  const panels = slugs.length
    ? await db.select().from(aeoPanel).where(and(inArray(aeoPanel.slug, slugs), eq(aeoPanel.isActive, true)))
    : []
  const library = slugs
    .map((slug) => panels.find((p) => p.slug === slug))
    .filter((p): p is (typeof panels)[number] => Boolean(p))
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      fit: brief.industryPanels.find((x) => x.slug === p.slug)?.fit ?? 'primary',
      questions: fillSlots(p.questions, {
        service: biz.service,
        city: biz.city,
        state: state?.name ?? biz.state,
        state_permit_agency: state?.permitAgency,
      }),
      directoryDomains: p.directoryDomains,
      referenceDomains: p.referenceDomains,
    }))

  try {
    const draft = await draftBusinessPanel(
      {
        businessName: biz.name,
        domain: biz.domain,
        otherDomains: biz.otherDomains,
        city: biz.city,
        stateName: state?.name ?? biz.state,
        brief,
        confirmed,
        library,
      },
      { model: options.model, call: options.call }
    )
    const stored = await db
      .update(businessPanel)
      .set({
        status: 'draft',
        questions: draft.questions,
        directoryDomains: draft.directoryDomains,
        referenceDomains: draft.referenceDomains,
        sourcePanels: library.map((l) => l.slug),
        model: draft.model,
        costUsd: sql`${businessPanel.costUsd} + ${draft.costUsd}::numeric`,
        error: null,
        lockedAt: null,
        leaseToken: null,
        updatedAt: new Date(),
      })
      .where(and(eq(businessPanel.id, job.id), eq(businessPanel.leaseToken, job.leaseToken)))
      .returning({ id: businessPanel.id })
    if (stored.length === 0) return { status: 'lost', costUsd: draft.costUsd, questions: draft.questions.length }

    const admin = process.env.AEO_ADMIN_EMAIL
    if (admin) {
      try {
        await (options.send ?? sendEmail)({
          to: admin,
          ...adminPanelDraftEmail({ businessName: biz.name, businessId: biz.id, version: job.version, questions: draft.questions.length }),
        })
      } catch {
        // The dashboard shows drafts waiting either way.
      }
    }
    return { status: 'draft', costUsd: draft.costUsd, questions: draft.questions.length }
  } catch (err) {
    const costUsd = err instanceof BusinessPanelError ? err.costUsd : 0
    const message = (err instanceof Error ? err.message : String(err)).slice(0, 1000)
    const status = await failJob(job, message, costUsd, job.attempts >= MAX_PANEL_ATTEMPTS)
    return { status, costUsd, questions: 0, error: message }
  }
}

async function failJob(job: ClaimedPanel, message: string, costUsd: number, final: boolean): Promise<'failed' | 'queued'> {
  await db
    .update(businessPanel)
    .set({
      status: final ? 'failed' : 'queued',
      costUsd: sql`${businessPanel.costUsd} + ${costUsd}::numeric`,
      error: message,
      lockedAt: null,
      leaseToken: null,
      updatedAt: new Date(),
    })
    .where(and(eq(businessPanel.id, job.id), eq(businessPanel.leaseToken, job.leaseToken)))
  return final ? 'failed' : 'queued'
}

/* ----------------------------- Admin ------------------------------ */

export async function listBusinessPanels(businessId: string) {
  return db
    .select()
    .from(businessPanel)
    .where(eq(businessPanel.businessId, businessId))
    .orderBy(desc(businessPanel.version))
}

export async function approvedBusinessPanel(businessId: string) {
  const [row] = await db
    .select()
    .from(businessPanel)
    .where(and(eq(businessPanel.businessId, businessId), eq(businessPanel.status, 'approved')))
    .limit(1)
  return row ?? null
}

export type PanelEdit = {
  questions: BusinessPanelQuestion[]
  directoryDomains: string[]
  referenceDomains: string[]
  note: string
}

export type EditResult = { ok: true; panelId: string } | { ok: false; error: string }

/**
 * Save the admin's edits. A draft is edited in place; editing the approved
 * version starts a new draft version, so runs already made keep pointing at
 * the questions they asked.
 */
export async function savePanelEdits(panelId: string, edit: PanelEdit): Promise<EditResult> {
  return db.transaction(async (tx) => {
    const [panel] = await tx.select().from(businessPanel).where(eq(businessPanel.id, panelId)).for('update').limit(1)
    if (!panel) return { ok: false, error: 'That panel no longer exists.' }
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`business_panel:${panel.businessId}`}))`)

    if (panel.status === 'draft') {
      await tx
        .update(businessPanel)
        .set({ ...edit, updatedAt: new Date() })
        .where(eq(businessPanel.id, panelId))
      return { ok: true, panelId }
    }
    if (panel.status !== 'approved') return { ok: false, error: 'Only a draft or the approved version can be edited.' }

    const busy = await tx
      .select({ id: businessPanel.id, status: businessPanel.status })
      .from(businessPanel)
      .where(and(eq(businessPanel.businessId, panel.businessId), inArray(businessPanel.status, ['queued', 'drafting', 'draft'])))
    if (busy.length) return { ok: false, error: 'A newer draft already exists. Edit that one instead.' }

    const [{ next }] = (
      await tx.execute<{ next: number }>(sql`
        select coalesce(max(version), 0) + 1 as next from business_panel where business_id = ${panel.businessId}
      `)
    ).rows
    const [created] = await tx
      .insert(businessPanel)
      .values({
        businessId: panel.businessId,
        version: Number(next),
        status: 'draft',
        sourcePanels: panel.sourcePanels,
        model: panel.model,
        ...edit,
      })
      .returning({ id: businessPanel.id })
    return { ok: true, panelId: created.id }
  })
}

/** Approve a draft: it becomes the version Pulse runs ask, and the last approved one is retired. */
export async function approvePanel(panelId: string, adminId: string): Promise<EditResult> {
  return db.transaction(async (tx) => {
    const [panel] = await tx.select().from(businessPanel).where(eq(businessPanel.id, panelId)).for('update').limit(1)
    if (!panel) return { ok: false, error: 'That panel no longer exists.' }
    if (panel.status !== 'draft') return { ok: false, error: 'Only a draft can be approved.' }
    if (panel.questions.length === 0) return { ok: false, error: 'A panel needs at least one question.' }
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`business_panel:${panel.businessId}`}))`)

    await tx
      .update(businessPanel)
      .set({ status: 'retired', updatedAt: new Date() })
      .where(and(eq(businessPanel.businessId, panel.businessId), eq(businessPanel.status, 'approved')))
    await tx
      .update(businessPanel)
      .set({ status: 'approved', approvedBy: adminId, approvedAt: new Date(), updatedAt: new Date() })
      .where(eq(businessPanel.id, panelId))
    return { ok: true, panelId }
  })
}
