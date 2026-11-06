import { z } from 'zod'
import { otherDomainsField, required, websiteField } from '@/lib/aeo/request-schema'
import { STATE_CODES } from '@/lib/aeo/states'

/** "Something else": no industry fits, so the business gets its own question set (docs/pulse-plan.md §4.5). */
export const CUSTOM_INDUSTRY = 'other'

/**
 * The business profile form. `industry` is checked against the active panels
 * when it's saved; "other" needs a short description of what they do.
 */
export const businessProfileSchema = z
  .object({
    name: required('Business name', 120),
    website: websiteField,
    otherDomains: otherDomainsField,
    industry: z.string({ error: 'Choose an industry' }).trim().min(1, 'Choose an industry').max(80),
    customIndustry: z.string().trim().max(200, 'Keep it under 200 characters').default(''),
    service: required('Main service', 80),
    city: required('Town or city', 80),
    state: z
      .string({ error: 'Choose a state' })
      .trim()
      .toUpperCase()
      .refine((code) => STATE_CODES.includes(code), 'Choose a state'),
  })
  .superRefine((value, ctx) => {
    if (value.industry === CUSTOM_INDUSTRY && value.customIndustry.length < 3) {
      ctx.addIssue({ code: 'custom', path: ['customIndustry'], message: 'Tell us what your business does' })
    }
  })
  .transform((value) => ({
    ...value,
    // The main website is already the business's own.
    otherDomains: value.otherDomains.filter((d) => d !== value.website),
    customIndustry: value.industry === CUSTOM_INDUSTRY ? value.customIndustry : '',
  }))

export type BusinessProfileInput = z.infer<typeof businessProfileSchema>
