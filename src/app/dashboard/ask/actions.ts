'use server'

import { z } from 'zod'
import { requireOrg } from '@/lib/org'
import { ask } from '@/lib/ai/ask'
import type { AskResult } from '@/lib/ai/schema'

export type AskState = {
  status: 'idle' | 'ok' | 'error'
  question?: string
  result?: AskResult
  message?: string
}

const questionSchema = z.string().trim().min(3, 'Ask a fuller question').max(500)

export async function askAction(_prev: AskState, formData: FormData): Promise<AskState> {
  const { orgId, orgName, userId } = await requireOrg()

  const parsed = questionSchema.safeParse(formData.get('question'))
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0].message }
  }
  const question = parsed.data

  const outcome = await ask({ orgId, orgName, userId, question })
  if (!outcome.ok) {
    return { status: 'error', question, message: outcome.message }
  }
  return { status: 'ok', question, result: outcome.result }
}
