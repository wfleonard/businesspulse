import { z } from 'zod'
import { metricKeySchema } from '@/lib/metrics/schemas'

/**
 * Per-customer API connector configuration. Validated with Zod and stored
 * encrypted at rest (AES-256-GCM). Secrets (tokens, passwords) live inside this
 * blob and are never returned to the client.
 */

export const authConfigSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('none') }),
  z.object({
    type: z.literal('apiKey'),
    header: z.string().min(1),
    key: z.string().min(1),
  }),
  z.object({ type: z.literal('bearer'), token: z.string().min(1) }),
  z.object({
    type: z.literal('basic'),
    username: z.string().min(1),
    password: z.string().min(1),
  }),
])
export type AuthConfig = z.infer<typeof authConfigSchema>

/**
 * One field mapping. Two modes:
 *  - per-row (default): each row → one metric value at valuePath, dated by periodStartPath.
 *  - aggregate ('count' | 'sum'): group rows into period buckets (by periodGranularity,
 *    dated by periodStartPath) and emit one value per bucket — count of rows, or the
 *    sum of valuePath. Use this to turn a record list into a time series.
 */
export const mappingSchema = z
  .object({
    metricKey: metricKeySchema,
    valuePath: z.string().min(1).optional(),
    periodStartPath: z.string().min(1),
    periodEndPath: z.string().optional(),
    aggregate: z.enum(['count', 'sum']).optional(),
    periodGranularity: z.enum(['day', 'month', 'quarter', 'year']).optional(),
    dimensions: z.record(z.string(), z.string()).optional(),
  })
  .refine((m) => m.aggregate === 'count' || !!m.valuePath, {
    message: 'valuePath is required unless aggregate is "count"',
    path: ['valuePath'],
  })
export type Mapping = z.infer<typeof mappingSchema>

export const endpointSchema = z.object({
  path: z.string().min(1),
  method: z.literal('GET').default('GET'),
  query: z.record(z.string(), z.string()).optional(),
  /** Path to the array of rows in the response; omit if the body is the array. */
  rowsPath: z.string().optional(),
  /** Keep only rows where every condition matches (case-insensitive). */
  filter: z.array(z.object({ path: z.string().min(1), equals: z.string() })).optional(),
  mappings: z.array(mappingSchema).min(1),
})
export type EndpointConfig = z.infer<typeof endpointSchema>

export const apiConnectorConfigSchema = z.object({
  baseUrl: z.string().url(),
  auth: authConfigSchema.default({ type: 'none' }),
  endpoints: z.array(endpointSchema).min(1),
  /** Optional cron cadence for scheduled sync (used by the worker later). */
  schedule: z.string().optional(),
})
export type ApiConnectorConfig = z.infer<typeof apiConnectorConfigSchema>

/** Parse + validate untrusted config (from a form/JSON textarea). */
export function parseApiConfig(input: unknown):
  | { ok: true; config: ApiConnectorConfig }
  | { ok: false; errors: string[] } {
  const res = apiConnectorConfigSchema.safeParse(input)
  if (res.success) return { ok: true, config: res.data }
  return {
    ok: false,
    errors: res.error.issues.map(
      (i) => `${i.path.join('.') || '(root)'}: ${i.message}`
    ),
  }
}

/** A normalized value ready to persist into metric_value. */
export type NormalizedValue = {
  metricKey: string
  periodStart: Date
  periodEnd: Date
  value: number
  dimensions: Record<string, string>
}
