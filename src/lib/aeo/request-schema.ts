import { z } from 'zod'
import { normalizeDomain } from './domain'
import { STATE_CODES } from './states'

const required = (label: string, max: number) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(2, `${label} is required`)
    .max(max, `${label} is too long`)

/** Body of POST /api/aeo/requests. `website` comes out normalized to a bare domain. */
export const snapshotRequestSchema = z.object({
  businessName: required('Business name', 120),
  website: z
    .string({ error: 'Website is required' })
    .max(2048)
    .transform((value, ctx) => {
      const domain = normalizeDomain(value)
      if (!domain) {
        ctx.addIssue({ code: 'custom', message: 'Enter your website, like example.com' })
        return z.NEVER
      }
      return domain
    }),
  service: required('Service', 80),
  city: required('City', 80),
  state: z
    .string({ error: 'Choose a state' })
    .trim()
    .toUpperCase()
    .refine((code) => STATE_CODES.includes(code), 'Choose a state'),
  /** A canned panel slug, or "other" for a generated panel. */
  vertical: z.string().trim().max(80).default('other'),
  email: z
    .string({ error: 'Email is required' })
    .trim()
    .toLowerCase()
    .pipe(z.email('Enter a valid email address').max(254, 'Enter a valid email address')),
  contactConsent: z.boolean().default(false),
  turnstileToken: z.string().max(2048).default(''),
})

export type SnapshotRequestInput = z.infer<typeof snapshotRequestSchema>

/** First message per field, for showing next to the form inputs. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form')
    fields[key] ??= issue.message
  }
  return fields
}
