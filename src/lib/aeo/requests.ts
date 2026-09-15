import { and, asc, desc, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { aeoPanel, aeoRequest, aeoRun } from '@/lib/db/schema'
import type { SnapshotRequestInput } from './request-schema'
import { hashToken, newPublicId, newVerifyToken } from './tokens'

/** A domain gets at most one new snapshot run in this many days; later requests reuse it. */
export const REUSE_DAYS = 30

export type PanelOption = { slug: string; name: string }

export async function activePanels(): Promise<PanelOption[]> {
  return db
    .select({ slug: aeoPanel.slug, name: aeoPanel.name })
    .from(aeoPanel)
    .where(eq(aeoPanel.isActive, true))
    .orderBy(asc(aeoPanel.name))
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

  const [panel] =
    input.vertical && input.vertical !== 'other'
      ? await db
          .select({ slug: aeoPanel.slug })
          .from(aeoPanel)
          .where(and(eq(aeoPanel.slug, input.vertical), eq(aeoPanel.isActive, true)))
          .limit(1)
      : []

  await db.insert(aeoRequest).values({
    email: input.email,
    businessName: input.businessName,
    domain: input.website,
    service: input.service,
    city: input.city,
    state: input.state,
    panelSlug: panel?.slug ?? null,
    contactConsent: input.contactConsent,
    verifyTokenHash: hash,
    verifyExpiresAt: expiresAt,
    ipAddress: ip,
  })

  return { token }
}

export type RunStatus = (typeof aeoRun.$inferSelect)['status']

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
 *
 * Reuse: a snapshot run for the same domain that is queued, running, or done in
 * the last REUSE_DAYS days is shared rather than paid for again. A per-domain
 * advisory lock stops two simultaneous verifications from both creating a run.
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

    await tx
      .update(aeoRequest)
      .set({ verifiedAt: now, runId: run.id })
      .where(eq(aeoRequest.id, request.id))

    return {
      status: 'verified',
      firstVisit: true,
      reused: Boolean(existing),
      ...details,
      run: { publicId: run.publicId, status: run.status },
    }
  })
}
