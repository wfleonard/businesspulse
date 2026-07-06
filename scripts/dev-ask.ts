/**
 * Dev helper: run one grounded Ask against the real model using your live DB
 * data. Proves the Stage 3 pipeline (summary -> prompt -> structured answer).
 *
 *   ANTHROPIC_API_KEY=sk-... npm run dev:ask -- "why did my numbers change?"
 */
import 'dotenv/config'
import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })

import Anthropic from '@anthropic-ai/sdk'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { organization, metricDefinition, metricValue } from '@/lib/db/schema'
import { buildSummary, type DefLite } from '@/lib/ai/summarize'
import { SYSTEM_PROMPT, buildUserContent } from '@/lib/ai/prompt'
import { ANSWER_JSON_SCHEMA, answerSchema } from '@/lib/ai/schema'

const MODEL = process.env.BP_ASK_MODEL ?? 'claude-sonnet-5'

async function main() {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    console.error('Set ANTHROPIC_API_KEY (in .env.local or the environment) to run this.')
    process.exit(1)
  }
  const question =
    process.argv.slice(2).join(' ') ||
    'What should I pay attention to this month, and what should I do about it?'

  const [org] = await db.select().from(organization).limit(1)
  if (!org) throw new Error('No organization — run `npm run seed` first.')

  const defs = await db
    .select()
    .from(metricDefinition)
    .where(eq(metricDefinition.orgId, org.id))

  const data = []
  for (const d of defs.filter((x) => x.isActive)) {
    const rows = await db
      .select()
      .from(metricValue)
      .where(eq(metricValue.metricKey, d.key))
      .orderBy(asc(metricValue.periodStart))
    const def: DefLite = {
      key: d.key,
      label: d.label,
      unit: d.unit,
      direction: d.direction,
      target: d.target != null ? Number(d.target) : null,
    }
    data.push({
      def,
      series: rows.map((r) => ({
        periodStart: r.periodStart,
        periodEnd: r.periodEnd,
        value: Number(r.value),
      })),
    })
  }

  const summary = buildSummary(org.name, new Date(), data)
  const client = new Anthropic()

  console.log(`\nQ: ${question}\n(model: ${MODEL}, ${summary.metrics.length} metrics)\n`)

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    thinking: { type: 'disabled' },
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserContent(summary, question) }],
    output_config: { format: { type: 'json_schema', schema: ANSWER_JSON_SCHEMA } },
  })

  const text = res.content.find((b) => b.type === 'text')
  if (!text || text.type !== 'text') throw new Error('No text block in response')
  const answer = answerSchema.parse(JSON.parse(text.text))

  console.log('ANSWER:', answer.answer, '\n')
  if (answer.drivers.length) console.log('DRIVERS:\n -', answer.drivers.join('\n - '), '\n')
  if (answer.suggestedActions.length)
    console.log('ACTIONS:\n -', answer.suggestedActions.join('\n - '), '\n')
  console.log('SOURCE METRICS:', answer.sourceMetricRefs.join(', '))
  console.log('CONFIDENCE:', answer.confidence)
  console.log('TOKENS:', res.usage.input_tokens, 'in /', res.usage.output_tokens, 'out')
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
