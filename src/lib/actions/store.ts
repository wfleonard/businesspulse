import 'server-only'
import { and, eq, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { recommendation } from '@/lib/db/schema'
import type { AiRecommendation } from '@/lib/ai/recommend'

export type RecommendationRow = {
  id: string
  title: string
  rationale: string
  priority: 'high' | 'medium' | 'low'
  metricRefs: string[]
  status: 'suggested' | 'accepted' | 'dismissed' | 'done'
  createdAt: Date
}

export async function listRecommendations(orgId: string): Promise<RecommendationRow[]> {
  const rows = await db
    .select()
    .from(recommendation)
    .where(eq(recommendation.orgId, orgId))
    .orderBy(desc(recommendation.createdAt))
    .limit(100)
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    rationale: r.rationale,
    priority: r.priority,
    metricRefs: r.metricRefs ?? [],
    status: r.status,
    createdAt: r.createdAt,
  }))
}

export async function countOpenRecommendations(orgId: string): Promise<number> {
  const rows = await db
    .select({ id: recommendation.id })
    .from(recommendation)
    .where(and(eq(recommendation.orgId, orgId), eq(recommendation.status, 'suggested')))
  return rows.length
}

/**
 * Replace the org's still-open (`suggested`) recommendations with a fresh set,
 * preserving accepted/dismissed/done history. Keeps the suggestion list current
 * on regenerate instead of piling up duplicates. Returns count inserted.
 */
export async function replaceSuggested(
  orgId: string,
  recs: AiRecommendation[]
): Promise<number> {
  await db
    .delete(recommendation)
    .where(and(eq(recommendation.orgId, orgId), eq(recommendation.status, 'suggested')))
  if (recs.length === 0) return 0
  await db.insert(recommendation).values(
    recs.map((r) => ({
      orgId,
      title: r.title,
      rationale: r.rationale,
      priority: r.priority,
      metricRefs: r.metricRefs,
    }))
  )
  return recs.length
}

export async function setRecommendationStatus(
  orgId: string,
  id: string,
  status: 'suggested' | 'accepted' | 'dismissed' | 'done'
): Promise<void> {
  await db
    .update(recommendation)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(recommendation.orgId, orgId), eq(recommendation.id, id)))
}
