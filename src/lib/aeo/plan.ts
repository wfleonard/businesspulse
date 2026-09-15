import { asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { aeoPanel, aeoRequest } from '@/lib/db/schema'
import { fillSlots, sampleQuestions, type PanelQuestion } from './questions'
import { stateInfo } from './states'

/** A run that can't succeed however often it is retried. It fails immediately. */
export class PermanentRunError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PermanentRunError'
  }
}

export type RunPlan = {
  businessName: string
  domain: string
  directoryDomains: string[]
  referenceDomains: string[]
  questions: PanelQuestion[]
  panelVersion: number | null
}

export type PlanTarget = {
  id: string
  domain: string
  panelSource: 'canned' | 'generated'
  panelSlug: string | null
}

type PanelInput = Pick<
  typeof aeoPanel.$inferSelect,
  'questions' | 'directoryDomains' | 'referenceDomains' | 'version'
>
type RequestInput = Pick<typeof aeoRequest.$inferSelect, 'businessName' | 'service' | 'city' | 'state'>

/** The questions a canned-panel run will ask, and how to score the answers. */
export function buildCannedPlan(
  panel: PanelInput,
  request: RequestInput,
  domain: string,
  questionCount: number
): RunPlan {
  const state = stateInfo(request.state)
  const filled = fillSlots(panel.questions, {
    business: request.businessName,
    service: request.service,
    city: request.city,
    state: state?.name ?? request.state,
    state_permit_agency: state?.permitAgency,
  })

  const questions = sampleQuestions(filled, questionCount, domain)
  if (questions.length === 0) {
    throw new PermanentRunError('no panel question can be filled from this request')
  }

  return {
    businessName: request.businessName,
    domain,
    directoryDomains: panel.directoryDomains,
    referenceDomains: panel.referenceDomains,
    questions,
    panelVersion: panel.version,
  }
}

export async function planRun(run: PlanTarget, questionCount: number): Promise<RunPlan> {
  if (run.panelSource === 'generated') {
    throw new PermanentRunError('generated panels are not implemented yet (M5)')
  }
  if (!run.panelSlug) {
    throw new PermanentRunError('canned run has no panel_slug')
  }

  const [panel] = await db.select().from(aeoPanel).where(eq(aeoPanel.slug, run.panelSlug)).limit(1)
  if (!panel) {
    throw new PermanentRunError(`panel '${run.panelSlug}' does not exist`)
  }

  // Several requests can share a run (30-day reuse); the first one defines it.
  const [request] = await db
    .select()
    .from(aeoRequest)
    .where(eq(aeoRequest.runId, run.id))
    .orderBy(asc(aeoRequest.createdAt))
    .limit(1)
  if (!request) {
    throw new PermanentRunError('run has no linked request')
  }

  return buildCannedPlan(panel, request, run.domain, questionCount)
}
