import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import type { AeoPanelDraft } from '@/lib/db/schema'
import { tokenCostUsd } from './generate'
import { cleanDomains, MAX_QUESTION_LENGTH, PANEL_SLOTS } from './panel-content'
import { COMMON_DIRECTORY_DOMAINS, COMMON_REFERENCE_DOMAINS } from './panels/common'
import type { PanelQuestion } from './questions'

/**
 * Claude drafts of canned panels for backlog industries. A draft is only a
 * starting point: it is reviewed in the dashboard and checked by
 * validatePanelContent before it can be published.
 */

export const DRAFT_CATEGORIES = [
  'service-geo',
  'cost',
  'permits',
  'regulation',
  'comparison',
  'technical',
  'application',
  'vendor-selection',
  'problem',
  'buyer-role',
] as const

/** Opus for drafts: they are rare, reviewed by hand, and the panel lives for months. */
export const DEFAULT_DRAFT_MODEL = 'claude-opus-5-5'
/** Server-side fallback if the draft model declines (array form, the one this SDK version types). */
const FALLBACK_MODEL = 'claude-opus-4-8'

const DRAFT_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          category: { type: 'string', enum: DRAFT_CATEGORIES },
          question: { type: 'string' },
        },
        required: ['category', 'question'],
      },
    },
    directory_domains: { type: 'array', items: { type: 'string' } },
    reference_domains: { type: 'array', items: { type: 'string' } },
  },
  required: ['questions', 'directory_domains', 'reference_domains'],
} as const

const outputSchema = z.object({
  questions: z.array(z.object({ category: z.enum(DRAFT_CATEGORIES), question: z.string() })),
  directory_domains: z.array(z.string()),
  reference_domains: z.array(z.string()),
})

export type DraftOutput = z.infer<typeof outputSchema>

export const DRAFT_SYSTEM_PROMPT = `You write question panels for an AI search visibility audit. Each panel serves every business in one industry. For a given business, the audit asks AI search tools such as ChatGPT and Perplexity the panel's questions and records which websites the answers cite, to show whether that business is visible to buyers.

The questions must be what a real buyer types before they know which company to hire:
- Write in the buyer's voice, the way people type into a search box. Short: under 15 words, never more than ${MAX_QUESTION_LENGTH} characters.
- Never name a specific company, brand, or website.
- Questions are templates. These slots are filled in for each business: {service} (the business's main service in its owner's words), {city}, and {state} (the full state name). Use no other slots. To ask about a state regulator or licensing board, name the state with {state} instead, as in "how to verify a contractor license in {state}".
- Write about 60 questions:
  - "service-geo": 10 to 12 questions from someone looking for a local provider. Start with "{service} near {city}, {state}", then name the industry's main services, specialties, and customer types, each with {city} or {state}.
  - "cost": 7 or 8 questions about price, fees, and what affects cost, including one with {state}.
  - "permits": 6 to 8 questions about permits, licenses, inspections, codes, or insurance rules, if the work involves them. For professions governed by regulators or ethics rules instead of permits, use "regulation" for these questions.
  - The rest spread across "comparison" (this vs that), "technical" (how it works), "application" (specific situations and project types), "vendor-selection" (how to choose and vet a provider), "problem" (something has gone wrong), and "buyer-role" (a specific kind of buyer describing their need, naming {state}).
  - Every question from someone who wants to hire or contact a provider names {city} or {state}. Only general "cost", "comparison", and "technical" questions may leave the place out.
- Cover the range of the industry: residential and commercial buyers where both exist, routine and urgent needs, small and large jobs.

Also list:
- directory_domains: 8 to 15 listing sites, marketplaces, and review directories that AI answers in this industry cite instead of the businesses themselves. Bare domains only, like "yelp.com".
- reference_domains: 10 to 20 sites that answers cite but that are not competitors: regulators, licensing boards, trade associations, industry publications, manufacturers, and consumer reference sites.`

export type DraftInput = {
  name: string
  buyers: string
  rationale: string
  guidance: string
}

export function buildDraftUserContent(input: DraftInput): string {
  const lines = [`Industry: ${input.name}`, `Buyers: ${input.buyers}`]
  if (input.rationale) lines.push(`Why this panel is being built: ${input.rationale}`)
  if (input.guidance.trim()) lines.push('', 'Direction from the reviewer:', input.guidance.trim())
  return lines.join('\n')
}

export class PanelDraftError extends Error {
  constructor(
    message: string,
    readonly costUsd = 0
  ) {
    super(message)
    this.name = 'PanelDraftError'
  }
}

const ALREADY_COMMON = new Set([...COMMON_DIRECTORY_DOMAINS, ...COMMON_REFERENCE_DOMAINS])

/**
 * Slots a draft may use. {state_permit_agency} always fills in the state
 * transportation department, which only fits road work (hdd-trenchless, in
 * code), and {business} would name the business being checked.
 */
const DRAFT_SLOTS = new Set([...PANEL_SLOTS].filter((slot) => slot !== 'business' && slot !== 'state_permit_agency'))

/** Drop anything that can't be asked or stored; the reviewer handles the rest. */
export function cleanDraft(output: DraftOutput): Pick<AeoPanelDraft, 'questions' | 'directoryDomains' | 'referenceDomains'> {
  const seen = new Set<string>()
  const questions: PanelQuestion[] = []
  for (const { category, question } of output.questions) {
    const q = question.replace(/\s+/g, ' ').trim()
    if (q.length < 8 || q.length > MAX_QUESTION_LENGTH) continue
    if (/https?:\/\/|www\./i.test(q)) continue
    if ([...q.matchAll(/\{([a-z_]+)\}/g)].some(([, slot]) => !DRAFT_SLOTS.has(slot))) continue
    const key = q.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    questions.push({ c: category, q })
  }

  const directoryDomains = cleanDomains(output.directory_domains).filter((d) => !ALREADY_COMMON.has(d))
  const referenceDomains = cleanDomains(output.reference_domains).filter(
    (d) => !ALREADY_COMMON.has(d) && !directoryDomains.includes(d)
  )
  return { questions, directoryDomains, referenceDomains }
}

export type DraftCall = (params: {
  model: string
  system: string
  user: string
}) => Promise<{ text: string | null; stopReason: string | null; inputTokens: number; outputTokens: number }>

let client: Anthropic | undefined

const anthropicDraftCall: DraftCall = async ({ model, system, user }) => {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    throw new PanelDraftError('ANTHROPIC_API_KEY is not set')
  }
  client ??= new Anthropic({ maxRetries: 2 })
  // Streamed: a full panel is a long answer, and streaming keeps it clear of HTTP timeouts.
  const message = await client.beta.messages
    .stream({
      model,
      max_tokens: 32000,
      betas: ['server-side-fallback-2026-06-01'],
      fallbacks: [{ model: FALLBACK_MODEL }],
      system,
      messages: [{ role: 'user', content: user }],
      output_config: { effort: 'high', format: { type: 'json_schema', schema: DRAFT_JSON_SCHEMA } },
    })
    .finalMessage()
  const text = message.content.find((block) => block.type === 'text')
  return {
    text: text && text.type === 'text' ? text.text : null,
    stopReason: message.stop_reason,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
  }
}

/** Opus 5.5 pricing; generate.ts prices unknown models as Sonnet. */
function draftCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  if (model === 'claude-opus-5-5') return (inputTokens * 4 + outputTokens * 20) / 1_000_000
  return tokenCostUsd(model, inputTokens, outputTokens)
}

export async function draftPanel(input: DraftInput, options: { model?: string; call?: DraftCall } = {}): Promise<AeoPanelDraft> {
  const model = options.model ?? DEFAULT_DRAFT_MODEL
  const response = await (options.call ?? anthropicDraftCall)({
    model,
    system: DRAFT_SYSTEM_PROMPT,
    user: buildDraftUserContent(input),
  })
  const costUsd = draftCostUsd(model, response.inputTokens, response.outputTokens)

  if (response.stopReason === 'refusal') throw new PanelDraftError('Claude declined to draft this panel', costUsd)
  if (response.stopReason === 'max_tokens') throw new PanelDraftError('the draft was cut off; try again', costUsd)
  if (!response.text) throw new PanelDraftError('Claude returned no text', costUsd)

  let data: unknown
  try {
    data = JSON.parse(response.text)
  } catch {
    throw new PanelDraftError('Claude returned invalid JSON', costUsd)
  }
  const parsed = outputSchema.safeParse(data)
  if (!parsed.success) throw new PanelDraftError('the draft did not match the expected format', costUsd)

  const cleaned = cleanDraft(parsed.data)
  if (cleaned.questions.length < 20) {
    throw new PanelDraftError(`only ${cleaned.questions.length} usable questions came back; try again`, costUsd)
  }
  return {
    ...cleaned,
    // The backlog name, already chosen for the industry dropdown; the reviewer can still change it.
    name: input.name,
    model,
    costUsd,
    generatedAt: new Date().toISOString(),
  }
}
