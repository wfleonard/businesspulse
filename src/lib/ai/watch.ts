import 'server-only'
import { z } from 'zod'
import { ASK_MODEL, aiConfigured, getAnthropic } from './model'
import type { OrgSummary } from './summarize'
import type { MaterialChange } from '@/lib/watch/rules'

const WATCH_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    intro: {
      type: 'string',
      description: 'One-sentence plain-English summary of the day, grounded in the data.',
    },
    insights: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          metricKey: { type: 'string' },
          summary: { type: 'string' },
        },
        required: ['metricKey', 'summary'],
      },
    },
  },
  required: ['intro', 'insights'],
} as const

const watchSchema = z.object({
  intro: z.string(),
  insights: z.array(z.object({ metricKey: z.string(), summary: z.string() })),
})

const SYSTEM = `You are BusinessPulse, watching a small business's metrics.

You are given a JSON metric summary and a list of notable period-over-period changes. Write:
- "intro": one plain-English sentence a busy owner would read first thing in the morning.
- "insights": for each notable change, a short grounded explanation of what changed and why it matters. Use ONLY the numbers in the summary. Respect each metric's "direction" (for "down_good" a decrease is good).

Never invent metrics or numbers. Each insight's "metricKey" must be one of the keys in the summary.`

export type WatchInsights = { intro: string; insights: { metricKey: string; summary: string }[] }

/** Generate grounded explanations for material changes. Returns null when AI is
 * unconfigured or the call fails (the watch job proceeds without narrative). */
export async function explainChanges(
  summary: OrgSummary,
  changes: MaterialChange[]
): Promise<WatchInsights | null> {
  if (!aiConfigured() || changes.length === 0) return null

  const known = new Set(summary.metrics.map((m) => m.key))
  const content = [
    'METRIC SUMMARY (JSON):',
    JSON.stringify(summary),
    '',
    'NOTABLE CHANGES (JSON):',
    JSON.stringify(changes),
  ].join('\n')

  try {
    const client = getAnthropic()
    const res = await client.messages.create({
      model: ASK_MODEL,
      max_tokens: 1200,
      thinking: { type: 'disabled' },
      system: SYSTEM,
      messages: [{ role: 'user', content }],
      output_config: { format: { type: 'json_schema', schema: WATCH_JSON_SCHEMA } },
    })
    if (res.stop_reason === 'refusal') return null
    const text = res.content.find((b) => b.type === 'text')
    if (!text || text.type !== 'text') return null
    const parsed = watchSchema.parse(JSON.parse(text.text))
    return {
      intro: parsed.intro,
      insights: parsed.insights.filter((i) => known.has(i.metricKey)),
    }
  } catch (err) {
    console.error('explainChanges failed', err)
    return null
  }
}
