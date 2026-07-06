import 'server-only'
import { db } from '@/lib/db'
import { aiQuery } from '@/lib/db/schema'
import { rateLimit } from '@/lib/rate-limit'
import { ASK_MODEL, aiConfigured, getAnthropic } from './model'
import { buildOrgSummary } from './summary'
import { SYSTEM_PROMPT, buildUserContent } from './prompt'
import { ANSWER_JSON_SCHEMA, answerSchema, type AskResult } from './schema'
import { resolveRefs, sanitizeAnswer } from './refs'

export type AskOutcome =
  | { ok: true; result: AskResult; empty: boolean }
  | { ok: false; reason: 'not_configured' | 'rate_limited' | 'error'; message: string }

const ASK_LIMIT = 30 // requests
const ASK_WINDOW = 60 // seconds

export async function ask(params: {
  orgId: string
  orgName: string
  userId: string
  question: string
}): Promise<AskOutcome> {
  const { orgId, orgName, userId, question } = params

  if (!aiConfigured()) {
    return {
      ok: false,
      reason: 'not_configured',
      message: 'The AI assistant is not configured yet. Add ANTHROPIC_API_KEY to enable it.',
    }
  }

  const rl = await rateLimit(`ask:${userId}`, ASK_LIMIT, ASK_WINDOW)
  if (!rl.success) {
    return {
      ok: false,
      reason: 'rate_limited',
      message: `Too many questions — try again in ${rl.resetSeconds}s.`,
    }
  }

  const summary = await buildOrgSummary(orgId, orgName)
  const known = new Map(summary.metrics.map((m) => [m.key, m.label]))

  // No data yet — answer helpfully without spending a model call.
  if (summary.metrics.length === 0 || summary.metrics.every((m) => m.current === null)) {
    return {
      ok: true,
      empty: true,
      result: {
        answer:
          "There's no metric data to analyze yet. Add metrics or connect a data source, then ask again.",
        drivers: [],
        suggestedActions: ['Add a metric or connect an API source, then record or sync some values.'],
        sourceMetricRefs: [],
        refs: [],
        confidence: 'low',
      },
    }
  }

  try {
    const client = getAnthropic()
    const response = await client.messages.create({
      model: ASK_MODEL,
      max_tokens: 1500,
      thinking: { type: 'disabled' },
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserContent(summary, question) }],
      output_config: { format: { type: 'json_schema', schema: ANSWER_JSON_SCHEMA } },
    })

    if (response.stop_reason === 'refusal') {
      return { ok: false, reason: 'error', message: 'The assistant declined to answer that.' }
    }

    const text = response.content.find((b) => b.type === 'text')
    if (!text || text.type !== 'text') {
      return { ok: false, reason: 'error', message: 'The assistant returned an unexpected response.' }
    }

    const parsed = answerSchema.parse(JSON.parse(text.text))
    const clean = sanitizeAnswer(parsed, known)
    const refs = resolveRefs(clean.sourceMetricRefs, known)

    // Log the query (references only — no raw values or secrets).
    try {
      await db.insert(aiQuery).values({
        orgId,
        userId,
        question,
        metricRefs: clean.sourceMetricRefs,
        model: ASK_MODEL,
        tokensIn: response.usage.input_tokens,
        tokensOut: response.usage.output_tokens,
      })
    } catch (err) {
      console.error('ai_query log failed', err)
    }

    return { ok: true, empty: false, result: { ...clean, refs } }
  } catch (err) {
    console.error('ask() failed', err)
    return {
      ok: false,
      reason: 'error',
      message: 'Something went wrong answering that. Please try again.',
    }
  }
}
