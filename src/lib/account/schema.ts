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

const list = (max: number, itemMax: number) =>
  z
    .array(z.string().trim().max(itemMax))
    .max(max)
    .transform((items) => [...new Set(items.filter(Boolean))])

/** Free text, one per line (or separated by commas, unless `lines`), as a list. */
const textList = (max: number, itemMax: number, separator: RegExp = /[\n,;]+/) =>
  z
    .string()
    .max(4000)
    .default('')
    .transform((value) => [...new Set(value.split(separator).map((v) => v.trim()).filter(Boolean))])
    .pipe(z.array(z.string().max(itemMax, `Keep each item under ${itemMax} characters`)).max(max, `List at most ${max}`))

/** The brief confirmation form (/account/brief). */
export const confirmBriefSchema = z.object({
  /** Offering names from the brief that the client kept ticked. */
  offerings: list(40, 120),
  // One per line, as the form says: a line like "roofing, gutters, and siding" stays one entry.
  addedOfferings: textList(15, 200, /\n+/),
  buyers: list(20, 120),
  addedBuyers: textList(10, 200, /\n+/),
  scope: z.enum(['local', 'regional', 'statewide', 'multi_state', 'national', 'international'], { error: 'Choose how far you serve' }),
  // One per line: a place like "Tinton Falls, NJ" has a comma in it.
  places: textList(40, 120, /[\n;]+/),
  notes: z.string().trim().max(2000, 'Keep notes under 2,000 characters').default(''),
  /** Answers to the questions the site left open. Blank answers are dropped. */
  answers: z
    .array(
      z.object({
        question: z.string().trim().max(300),
        answer: z.string().trim().max(1000, 'Keep each answer under 1,000 characters'),
      })
    )
    .max(20)
    .default([])
    .transform((list) => list.filter((a) => a.question && a.answer)),
})

export type ConfirmBriefInput = z.infer<typeof confirmBriefSchema>
