import { and, asc, desc, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { aeoPanel, aeoRequest, aeoRun } from '@/lib/db/schema'
import type { ProspectRequestInput, SnapshotRequestInput } from './request-schema'
import { hashToken, newPublicId, newVerifyToken } from './tokens'

/** A domain gets at most one new snapshot run in this many days; later requests reuse it. */
export const REUSE_DAYS = 30

export type PanelOption = { slug: string; name: string }

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

export async function activePanels(): Promise<PanelOption[]> {
  return db
    .select({ slug: aeoPanel.slug, name: aeoPanel.name })
    .from(aeoPanel)
    .where(eq(aeoPanel.isActive, true))
    .orderBy(asc(aeoPanel.name))
}

/** The chosen vertical if it's an active canned panel; otherwise null, meaning a generated panel. */
async function activePanelSlug(vertical: string | undefined): Promise<string | null> {
  if (!vertical || vertical === 'other') return null
  const [panel] = await db
    .select({ slug: aeoPanel.slug })
    .from(aeoPanel)
    .where(and(eq(aeoPanel.slug, vertical), eq(aeoPanel.isActive, true)))
    .limit(1)
  return panel?.slug ?? null
}

/**
 * Store an unverified request and return the token to email. The token itself
 * is never stored. An unknown or inactive vertical becomes a generated panel.
 */
export async function createRequest(
  input: SnapshotRequestInput,
  ip: string | null
): Promise<{ token: string }> {
  const { token, hash, expiresAt } = newVerifyToken()

  await db.insert(aeoRequest).values({
    email: input.email,
    businessName: input.businessName,
    domain: input.website,
    service: input.service,
    city: input.city,
    state: input.state,
    panelSlug: await activePanelSlug(input.vertical),
    contactConsent: input.contactConsent,
    verifyTokenHash: hash,
    verifyExpiresAt: expiresAt,
    ipAddress: ip,
  })

  return { token }
}

export type RunStatus = (typeof aeoRun.$inferSelect)['status']

type AttachedRun = { id: string; publicId: string; status: RunStatus }

/**
 * Mark a request verified and point it at a run, inside the caller's transaction.
 *
 * Reuse: a snapshot run for the same domain that is queued, running, or done in
 * the last REUSE_DAYS days is shared rather than paid for again. A per-domain
 * advisory lock stops two simultaneous requests from both creating a run.
 */
async function attachToRun(
  tx: Tx,
  request: { id: string; domain: string; panelSlug: string | null },
  now: Date
): Promise<{ run: AttachedRun; reused: boolean }> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`aeo_run:${request.domain}`}))`)

  const [existing] = await tx
    .select({ id: aeoRun.id, publicId: aeoRun.publicId, status: aeoRun.status })
    .from(aeoRun)
    .where(
      and(
        eq(aeoRun.domain, request.domain),
        eq(aeoRun.tier, 'snapshot'),
        sql`(${aeoRun.status} in ('queued', 'running')
             or (${aeoRun.status} = 'done'
                 and ${aeoRun.createdAt} > now() - ${REUSE_DAYS}::int * interval '1 day'))`
      )
    )
    .orderBy(desc(aeoRun.createdAt))
    .limit(1)

  const run =
    existing ??
    (
      await tx
        .insert(aeoRun)
        .values({
          publicId: newPublicId(),
          domain: request.domain,
          tier: 'snapshot',
          panelSource: request.panelSlug ? 'canned' : 'generated',
          panelSlug: request.panelSlug,
        })
        .returning({ id: aeoRun.id, publicId: aeoRun.publicId, status: aeoRun.status })
    )[0]

  await tx.update(aeoRequest).set({ verifiedAt: now, runId: run.id }).where(eq(aeoRequest.id, request.id))

  return { run, reused: Boolean(existing) }
}

export type VerifyOutcome =
  | { status: 'invalid' }
  | { status: 'expired' }
  | {
      status: 'verified'
      /** False when the link had already been used — nothing changed this time. */
      firstVisit: boolean
      /** True when this request was pointed at an existing run instead of a new one. */
      reused: boolean
      email: string
      businessName: string
      domain: string
      run: { publicId: string; status: RunStatus }
    }

/**
 * Verify an emailed token and attach the request to a run.
 *
 * Opening the link again returns the same run without changing anything. That
 * matters because email security scanners often open links before the person
 * does; the second visit must not look like an error or start another run.
 */
export async function verifyRequest(token: string, now: Date = new Date()): Promise<VerifyOutcome> {
  const hash = hashToken(token)

  return db.transaction(async (tx) => {
    const [request] = await tx
      .select()
      .from(aeoRequest)
      .where(eq(aeoRequest.verifyTokenHash, hash))
      .limit(1)
      .for('update')
    if (!request) return { status: 'invalid' }

    const details = {
      email: request.email,
      businessName: request.businessName,
      domain: request.domain,
    }

    if (request.verifiedAt) {
      if (!request.runId) return { status: 'invalid' }
      const [run] = await tx
        .select({ publicId: aeoRun.publicId, status: aeoRun.status })
        .from(aeoRun)
        .where(eq(aeoRun.id, request.runId))
        .limit(1)
      if (!run) return { status: 'invalid' }
      return { status: 'verified', firstVisit: false, reused: false, ...details, run }
    }

    if (request.verifyExpiresAt.getTime() <= now.getTime()) return { status: 'expired' }

    const { run, reused } = await attachToRun(tx, request, now)
    return {
      status: 'verified',
      firstVisit: true,
      reused,
      ...details,
      run: { publicId: run.publicId, status: run.status },
    }
  })
}

/**
 * A prospect snapshot started from the dashboard for outbound: verified at
 * once, no email to the prospect, and never emailed the report automatically.
 * Reuses a recent run for the domain like any other request.
 */
export async function createProspectRequest(
  input: ProspectRequestInput,
  now: Date = new Date()
): Promise<{ runId: string; publicId: string; reused: boolean }> {
  const panelSlug = await activePanelSlug(input.vertical)
  // Every request row needs a unique token hash; this one is never emailed or used.
  const { hash } = newVerifyToken(now)

  return db.transaction(async (tx) => {
    const [request] = await tx
      .insert(aeoRequest)
      .values({
        email: input.email,
        businessName: input.businessName,
        domain: input.website,
        service: input.service,
        city: input.city,
        state: input.state,
        panelSlug,
        contactConsent: false,
        verifyTokenHash: hash,
        verifyExpiresAt: now,
        ipAddress: null,
        source: 'outbound',
      })
      .returning({ id: aeoRequest.id })

    const { run, reused } = await attachToRun(tx, { id: request.id, domain: input.website, panelSlug }, now)
    return { runId: run.id, publicId: run.publicId, reused }
  })
}
