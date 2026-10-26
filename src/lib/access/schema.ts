import { z } from 'zod'
import { emailField, required } from '@/lib/aeo/request-schema'

/** Body of POST /api/access-requests. */
export const accessRequestSchema = z.object({
  name: required('Name', 120),
  email: emailField,
  note: z.string().trim().max(1000, 'Keep it under 1,000 characters').default(''),
})

export type AccessRequestInput = z.infer<typeof accessRequestSchema>
