import { z } from 'zod'

/** A metric key is a stable machine identifier: lower_snake_case. */
export const metricKeySchema = z
  .string()
  .trim()
  .min(1, 'Key is required')
  .max(64)
  .regex(/^[a-z][a-z0-9_]*$/, 'Use lower_snake_case (letters, numbers, underscore)')

export const directionSchema = z.enum(['up_good', 'down_good'])

export const definitionInputSchema = z.object({
  key: metricKeySchema,
  label: z.string().trim().min(1, 'Label is required').max(120),
  unit: z.string().trim().max(16).optional().or(z.literal('')),
  category: z.string().trim().max(60).optional().or(z.literal('')),
  direction: directionSchema,
  target: z.coerce.number().finite().optional().or(z.literal('')),
})

export const valueInputSchema = z
  .object({
    metricKey: metricKeySchema,
    periodStart: z.coerce.date(),
    periodEnd: z.coerce.date(),
    value: z.coerce.number().finite(),
  })
  .refine((v) => v.periodEnd >= v.periodStart, {
    message: 'Period end must not be before period start',
    path: ['periodEnd'],
  })

export type DefinitionInput = z.infer<typeof definitionInputSchema>
export type ValueInput = z.infer<typeof valueInputSchema>
