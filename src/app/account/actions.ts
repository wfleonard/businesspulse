'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { saveBusiness } from '@/lib/account/business'
import { businessProfileSchema } from '@/lib/account/schema'
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
