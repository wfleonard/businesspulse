import 'server-only'
import { z } from 'zod'
import { ASK_MODEL, aiConfigured, getAnthropic } from './model'
import type { OrgSummary } from './summarize'

const RECS_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string', description: 'Short imperative action, e.g. "Follow up on estimates".' },
          rationale: { type: 'string', description: 'Why — grounded in the numbers.' },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
          metricRefs: { type: 'array', items: { type: 'string' } },
        },
        required: ['title', 'rationale', 'priority', 'metricRefs'],
      },
    },
  },
  required: ['recommendations'],
} as const

const recsSchema = z.object({
  recommendations: z.array(
    z.object({
      title: z.string(),
      rationale: z.string(),
      priority: z.enum(['high', 'medium', 'low']),
      metricRefs: z.array(z.string()),
    })
  ),
})

export type AiRecommendation = z.infer<typeof recsSchema>['recommendations'][number]

const SYSTEM = `You are BusinessPulse, advising a small business owner on what to DO next.

Given a JSON metric summary, current alerts, and recent explanations, propose up to 5 concrete, prioritized next actions. Rules:
- Each action is a short imperative title (e.g. "Follow up on estimates", "Chase overdue invoices").
- "rationale" must cite the actual numbers and say why it matters. No generic advice.
- Prioritize by business impact: "high" for things costing money or worsening now, "low" for nice-to-haves.
- "metricRefs" must contain only metric "key" values that appear in the summary and that the action relates to.
- Use ONLY the data provided. Don't invent metrics or numbers. Prefer fewer, high-quality actions over filler.`

export type RecommendContext = {
  summary: OrgSummary
  alerts: string[]
  insights: string[]
}

/** Generate grounded, prioritized recommendations. Returns [] when AI is
 * unconfigured or the call fails (callers proceed without recs). */
export async function generateRecommendations(
  ctx: RecommendContext
): Promise<AiRecommendation[]> {
  if (!aiConfigured() || ctx.summary.metrics.length === 0) return []

  const known = new Set(ctx.summary.metrics.map((m) => m.key))
  const content = [
    'METRIC SUMMARY (JSON):',
    JSON.stringify(ctx.summary),
    '',
    'OPEN ALERTS:',
    ctx.alerts.length ? ctx.alerts.map((a) => `- ${a}`).join('\n') : '(none)',
    '',
    'RECENT EXPLANATIONS:',
    ctx.insights.length ? ctx.insights.map((i) => `- ${i}`).join('\n') : '(none)',
  ].join('\n')

  try {
    const client = getAnthropic()
    const res = await client.messages.create({
      model: ASK_MODEL,
      max_tokens: 1500,
      thinking: { type: 'disabled' },
      system: SYSTEM,
      messages: [{ role: 'user', content }],
      output_config: { format: { type: 'json_schema', schema: RECS_JSON_SCHEMA } },
    })
    if (res.stop_reason === 'refusal') return []
    const text = res.content.find((b) => b.type === 'text')
    if (!text || text.type !== 'text') return []
    const parsed = recsSchema.parse(JSON.parse(text.text))
    return parsed.recommendations.map((r) => ({
      ...r,
      metricRefs: r.metricRefs.filter((k) => known.has(k)),
    }))
  } catch (err) {
    console.error('generateRecommendations failed', err)
    return []
  }
}
