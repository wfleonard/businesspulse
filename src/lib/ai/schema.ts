import { z } from 'zod'

/**
 * Structured answer contract for the Ask layer. We send this JSON Schema to
 * Claude via output_config.format and validate the response with the matching
 * Zod schema. Keeping both in sync guarantees a grounded, parseable answer.
 */

export const ANSWER_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    answer: {
      type: 'string',
      description: 'Plain-English answer, grounded only in the provided metrics.',
    },
    drivers: {
      type: 'array',
      items: { type: 'string' },
      description: 'Plain-English reasons/drivers behind the answer.',
    },
    suggestedActions: {
      type: 'array',
      items: { type: 'string' },
      description: 'Concrete next steps tied to the data.',
    },
    sourceMetricRefs: {
      type: 'array',
      items: { type: 'string' },
      description: 'Metric keys (from the summary) that support this answer.',
    },
    confidence: {
      type: 'string',
      enum: ['high', 'medium', 'low'],
    },
  },
  required: ['answer', 'drivers', 'suggestedActions', 'sourceMetricRefs', 'confidence'],
} as const

export const answerSchema = z.object({
  answer: z.string(),
  drivers: z.array(z.string()),
  suggestedActions: z.array(z.string()),
  sourceMetricRefs: z.array(z.string()),
  confidence: z.enum(['high', 'medium', 'low']),
})

export type Answer = z.infer<typeof answerSchema>

/** Answer plus the resolved (label + key) refs for rendering links. */
export type AskResult = Answer & {
  refs: { key: string; label: string }[]
}
