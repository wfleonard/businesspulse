'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { confirmBrief } from '@/lib/account/brief'
import { saveBusiness } from '@/lib/account/business'
import { businessProfileSchema, confirmBriefSchema } from '@/lib/account/schema'
import { z } from 'zod'
import { createFixCheckout, requestFix, withdrawFix } from '@/lib/aeo/fix-requests'
import { createPulseCheckout } from '@/lib/aeo/payments'
import { fieldErrors } from '@/lib/aeo/request-schema'
import { requireSession } from '@/lib/session'

/** Field values as typed, echoed back so a form with errors keeps them. */
export type BusinessFormValues = Record<string, string>

export type BusinessFormState = { errors: Record<string, string>; values: BusinessFormValues } | null

const FIELDS = ['name', 'website', 'otherDomains', 'industry', 'customIndustry', 'service', 'city', 'state'] as const

/**
 * Save the signed-in customer's business profile. A server action is a public
 * endpoint, so it checks the session itself, and the business it writes is
 * always the session user's: the form carries no business or user id.
 */
export async function saveBusinessProfile(_prev: BusinessFormState, formData: FormData): Promise<BusinessFormState> {
  const { user } = await requireSession()
  const values: BusinessFormValues = Object.fromEntries(FIELDS.map((f) => [f, String(formData.get(f) ?? '')]))

  const parsed = businessProfileSchema.safeParse(values)
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values }

  const result = await saveBusiness(user.id, user.email, parsed.data)
  if (!result.ok) return { errors: { [result.field]: result.error }, values }

  revalidatePath('/account')
  redirect('/account?saved=1')
}

/** What the client entered, sent back with errors so the form keeps it (React resets a form after its action). */
export type BriefFormValues = {
  offerings: string[]
  addedOfferings: string
  buyers: string[]
  addedBuyers: string
  scope: string
  places: string
  notes: string
  answers: { question: string; answer: string }[]
}

export type BriefFormState = { errors: Record<string, string>; values: BriefFormValues } | null

/**
 * Confirm or correct the signed-in client's brief. Like every account action,
 * it acts only on the session user's business; the form carries no ids.
 */
export async function confirmBriefAction(_prev: BriefFormState, formData: FormData): Promise<BriefFormState> {
  const { user } = await requireSession()
  const values: BriefFormValues = {
    offerings: formData.getAll('offerings').map(String),
    addedOfferings: String(formData.get('addedOfferings') ?? ''),
    buyers: formData.getAll('buyers').map(String),
    addedBuyers: String(formData.get('addedBuyers') ?? ''),
    scope: String(formData.get('scope') ?? ''),
    places: String(formData.get('places') ?? ''),
    notes: String(formData.get('notes') ?? ''),
    // Paired fields: each question rides along with its answer box.
    answers: formData
      .getAll('gapQuestion')
      .map((question, i) => ({ question: String(question), answer: String(formData.getAll('gapAnswer')[i] ?? '') })),
  }
  const parsed = confirmBriefSchema.safeParse(values)
  if (!parsed.success) {
    console.warn(JSON.stringify({ at: new Date().toISOString(), event: 'brief_confirm_invalid', issues: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) }))
    return { errors: fieldErrors(parsed.error), values }
  }

  const result = await confirmBrief(user.id, user.email, parsed.data)
  if (!result.ok) return { errors: { form: result.error }, values }

  revalidatePath('/account')
  redirect('/account?confirmed=1')
}

/**
 * Buy a Pulse run: sends the signed-in client to Stripe Checkout. Eligibility
 * (approved questions, no run in progress, the 30-day rule) is checked from
 * the session user's own business; the form carries nothing.
 */
export async function buyPulseRun(): Promise<void> {
  const { user } = await requireSession()
  const result = await createPulseCheckout({ userId: user.id, email: user.email })
  if (!result.ok) redirect('/account?' + new URLSearchParams({ error: result.error }).toString())
  redirect(result.url)
}

const fixRequestSchema = z.object({
  publicId: z.string().min(10).max(64),
  note: z.string().max(2000).default(''),
})

/**
 * Ask for the $500 fix from a report. The report's public id comes from the
 * page, but requestFix only finds it inside the session user's own business.
 */
export async function requestFixAction(formData: FormData): Promise<void> {
  const { user } = await requireSession()
  const parsed = fixRequestSchema.safeParse({ publicId: formData.get('publicId'), note: formData.get('note') ?? '' })
  if (!parsed.success) redirect('/account?' + new URLSearchParams({ error: 'That request couldn’t be sent.' }).toString())
  const result = await requestFix(user.id, parsed.data.publicId, parsed.data.note)
  const back = '/account/reports/' + encodeURIComponent(parsed.data.publicId)
  if (!result.ok) redirect(back + '?' + new URLSearchParams({ error: result.error }).toString())
  revalidatePath('/account')
  redirect(back + '?fix=requested#fix')
}

/** Pay for the session user's quoted fix through Stripe Checkout. */
export async function payFixAction(): Promise<void> {
  const { user } = await requireSession()
  const result = await createFixCheckout(user.id, user.email)
  if (!result.ok) redirect('/account?' + new URLSearchParams({ error: result.error }).toString())
  redirect(result.url)
}

/** Withdraw the session user's unpaid fix request. */
export async function withdrawFixAction(): Promise<void> {
  const { user } = await requireSession()
  const result = await withdrawFix(user.id)
  if (!result.ok) redirect('/account?' + new URLSearchParams({ error: result.error }).toString())
  revalidatePath('/account')
  redirect('/account?fixwithdrawn=1')
}
