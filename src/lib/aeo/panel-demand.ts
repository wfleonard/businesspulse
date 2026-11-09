import { and, eq, sql } from 'drizzle-orm'
import { adminPanelDemandEmail } from '@/lib/access/emails'
import { db } from '@/lib/db'
import { aeoPanel, aeoPanelBacklog } from '@/lib/db/schema'
import { sendEmail } from '@/lib/email/provider'

/**
 * Demand for new industry panels. Every free snapshot that needs questions
 * written on the spot ("Something else" on the form) names its industry; that
 * industry goes on the panel backlog with a count of distinct businesses.
 * When the count reaches the threshold, the admin is emailed once, and the
 * backlog's existing draft-and-review flow turns it into a panel.
 */

export function demandThreshold(env: Record<string, string | undefined> = process.env): number {
  const value = Number(env.AEO_PANEL_DEMAND_THRESHOLD)
  return Number.isInteger(value) && value >= 1 ? value : 3
}

/** A backlog slug for an industry name: "Commercial Kitchen Equipment Repair" -> "commercial-kitchen-equipment-repair". */
export function industrySlug(industry: string): string {
  return industry
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '')
}

/** Industry names in use, so the generator reuses one instead of inventing a near-duplicate. */
export async function knownIndustries(limit = 150): Promise<string[]> {
  const [panels, backlog] = await Promise.all([
    db.select({ name: aeoPanel.name }).from(aeoPanel).where(eq(aeoPanel.isActive, true)),
    db.select({ name: aeoPanelBacklog.name }).from(aeoPanelBacklog).limit(limit),
  ])
  return [...new Set([...panels, ...backlog].map((r) => r.name))].slice(0, limit)
}

export type DemandResult =
  | { recorded: false; reason: string }
  | { recorded: true; slug: string; count: number; notified: boolean }

/** Count one business toward an industry's demand, and email the admin when it first reaches the threshold. */
export async function recordPanelDemand(
  industry: string,
  domain: string,
  options: { send?: typeof sendEmail; threshold?: number } = {}
): Promise<DemandResult> {
  const name = industry.replace(/\s+/g, ' ').trim()
  if (industrySlug(name).length < 3) return { recorded: false, reason: 'no usable industry name' }

  // The generator reuses known names; slugs don't always follow them ("Religious art & gifts" is
  // religious-art), so match by name first.
  const [live] = await db
    .select({ id: aeoPanel.id })
    .from(aeoPanel)
    .where(
      and(
        eq(aeoPanel.isActive, true),
        sql`(${aeoPanel.slug} = ${industrySlug(name)} or lower(${aeoPanel.name}) = ${name.toLowerCase()})`
      )
    )
    .limit(1)
  // An industry that already has a live panel isn't demand for a new one.
  if (live) return { recorded: false, reason: 'a panel for this industry is live' }
  const [existing] = await db
    .select({ slug: aeoPanelBacklog.slug })
    .from(aeoPanelBacklog)
    .where(sql`lower(${aeoPanelBacklog.name}) = ${name.toLowerCase()}`)
    .limit(1)
  const slug = existing?.slug ?? industrySlug(name)

  const domains = JSON.stringify([domain])
  const result = await db.execute<{ request_count: number; demand_notified_at: Date | null; status: string; name: string }>(sql`
    insert into aeo_panel_backlog (slug, name, rank, rationale, request_count, request_domains, last_requested_at)
    values (${slug}, ${name}, 1000, 'Asked for by free snapshots with no matching industry panel.', 1, ${domains}::jsonb, now())
    on conflict (slug) do update set
      request_domains = case
        when aeo_panel_backlog.request_domains @> ${domains}::jsonb then aeo_panel_backlog.request_domains
        when jsonb_array_length(aeo_panel_backlog.request_domains) >= 200 then aeo_panel_backlog.request_domains
        else aeo_panel_backlog.request_domains || ${domains}::jsonb
      end,
      request_count = case
        when aeo_panel_backlog.request_domains @> ${domains}::jsonb then aeo_panel_backlog.request_count
        else aeo_panel_backlog.request_count + 1
      end,
      last_requested_at = now(),
      updated_at = now()
    returning request_count, demand_notified_at, status, name
  `)
  const row = result.rows[0]
  const count = Number(row.request_count)
  const threshold = options.threshold ?? demandThreshold()
  if (count < threshold || row.demand_notified_at || row.status === 'skipped') {
    return { recorded: true, slug, count, notified: false }
  }

  // Claim the one notification, so two snapshots finishing together send one email.
  const claimed = await db.execute(sql`
    update aeo_panel_backlog set demand_notified_at = now()
    where slug = ${slug} and demand_notified_at is null
    returning slug
  `)
  if (claimed.rows.length === 0) return { recorded: true, slug, count, notified: false }

  const admin = process.env.AEO_ADMIN_EMAIL
  if (admin) {
    try {
      await (options.send ?? sendEmail)({ to: admin, ...adminPanelDemandEmail({ industry: row.name, count, slug }) })
    } catch {
      // The panels page shows the demand either way.
    }
  }
  return { recorded: true, slug, count, notified: true }
}
