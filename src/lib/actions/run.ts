import 'server-only'
import { buildOrgSummary } from '@/lib/ai/summary'
import { generateRecommendations, type AiRecommendation } from '@/lib/ai/recommend'
import { listAlerts, listRecentInsights } from '@/lib/watch/store'
import { replaceSuggested } from './store'

/** Build the grounding context for recommendations from live org state. */
export async function buildRecommendContext(orgId: string, orgName: string) {
  const [summary, alerts, insights] = await Promise.all([
    buildOrgSummary(orgId, orgName),
    listAlerts(orgId, true),
    listRecentInsights(orgId, 8),
  ])
  return {
    summary,
    alerts: alerts.map((a) => a.message),
    insights: insights.map((i) => i.summary),
  }
}

/** Generate grounded recommendations and replace the org's open suggestions. */
export async function generateAndStore(
  orgId: string,
  orgName: string
): Promise<AiRecommendation[]> {
  const ctx = await buildRecommendContext(orgId, orgName)
  const recs = await generateRecommendations(ctx)
  await replaceSuggested(orgId, recs)
  return recs
}
