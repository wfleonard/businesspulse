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

/** Most other websites one business can list. The panel enforces the same limit (Job::MAX_OTHER_DOMAINS). */
export const MAX_OTHER_DOMAINS = 10

/** Other websites the business runs, as free text separated by commas, spaces, or new lines. */
const otherDomains = z
  .string()
  .max(2048, 'That is too many websites')
  .default('')
  .transform((value, ctx) => {
    const domains: string[] = []
    for (const part of value.split(/[\s,;]+/).filter(Boolean)) {
      const domain = normalizeDomain(part)
      if (!domain) {
        ctx.addIssue({ code: 'custom', message: `"${part}" isn't a website, like example.com` })
        return z.NEVER
      }
      if (!domains.includes(domain)) domains.push(domain)
    }
    if (domains.length > MAX_OTHER_DOMAINS) {
      ctx.addIssue({ code: 'custom', message: `List at most ${MAX_OTHER_DOMAINS} other websites` })
      return z.NEVER
    }
    return domains
  })

/**
 * A prospect snapshot started from the dashboard. Same business fields as the
 * public form; the prospect's email is optional because nothing is sent to it.
 *
 * `otherDomains` is dashboard-only: a business that runs a second site gets
 * credit when AI search cites that one. The public form doesn't offer it, so a
 * visitor can't claim someone else's site as their own.
 */
export const prospectRequestSchema = snapshotRequestSchema
  .pick({ businessName: true, website: true, service: true, city: true, state: true, vertical: true })
  .extend({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .max(254, 'Enter a valid email address')
      .refine((value) => value === '' || z.email().safeParse(value).success, 'Enter a valid email address')
      .default(''),
    otherDomains,
  })
  // The main website is already the business's own; listing it again changes nothing.
  .transform((value) => ({ ...value, otherDomains: value.otherDomains.filter((d) => d !== value.website) }))

export type ProspectRequestInput = z.infer<typeof prospectRequestSchema>

/** First message per field, for showing next to the form inputs. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form')
    fields[key] ??= issue.message
  }
  return fields
}
