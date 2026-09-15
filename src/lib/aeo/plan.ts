import { asc, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { aeoPanel, aeoRequest, aeoRun, type AeoGeneratedPanel } from '@/lib/db/schema'
import { generatePanel, PanelGenerationError, type ModelCall } from './generate'
import { COMMON_DIRECTORY_DOMAINS, COMMON_REFERENCE_DOMAINS } from './panels/common'
import { fillSlots, sampleQuestions, type PanelQuestion } from './questions'
import { LeaseLostError } from './queue'
import { extractText, fetchHomepage, type FetchedPage } from './site'
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
  leaseToken: string
}

export type PlanOptions = {
  panelModel: string
  /** Tests only. */
  modelCall?: ModelCall
  /** Tests only. */
  fetchSite?: (domain: string) => Promise<FetchedPage>
}

export { COMMON_DIRECTORY_DOMAINS, COMMON_REFERENCE_DOMAINS }

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

/** The questions a generated-panel run will ask. Generated questions carry no slots. */
export function buildGeneratedPlan(
  panel: AeoGeneratedPanel,
  request: Pick<RequestInput, 'businessName'>,
  domain: string,
  questionCount: number
): RunPlan {
  // fillSlots with no values drops anything that still looks like a {slot}.
  const questions = sampleQuestions(fillSlots(panel.questions, {}), questionCount, domain)
  if (questions.length === 0) throw new PermanentRunError('the generated panel has no usable questions')

  return {
    businessName: request.businessName,
    domain,
    directoryDomains: COMMON_DIRECTORY_DOMAINS,
    referenceDomains: [...new Set([...COMMON_REFERENCE_DOMAINS, ...panel.referenceDomains])],
    questions,
    panelVersion: null,
  }
}

async function firstRequest(runId: string) {
  // Several requests can share a run (30-day reuse); the first one defines it.
  const [request] = await db
    .select()
    .from(aeoRequest)
    .where(eq(aeoRequest.runId, runId))
    .orderBy(asc(aeoRequest.createdAt))
    .limit(1)
  if (!request) throw new PermanentRunError('run has no linked request')
  return request
}

/** Record spend on the run right away, so it counts toward the daily cap even if the run later fails. */
async function addRunCost(run: PlanTarget, costUsd: number): Promise<void> {
  await db.execute(sql`
    update aeo_run set cost_usd = cost_usd + ${costUsd}::numeric
    where id = ${run.id} and lease_token = ${run.leaseToken}
  `)
}

async function generateForRun(
  run: PlanTarget,
  request: RequestInput,
  options: PlanOptions
): Promise<AeoGeneratedPanel> {
  let siteText: string | null = null
  try {
    const page = await (options.fetchSite ?? fetchHomepage)(run.domain)
    siteText = extractText(page.html) || null
  } catch (err) {
    // An unreadable site still gets a report, built from the form alone.
    console.warn(
      JSON.stringify({
        at: new Date().toISOString(),
        event: 'site_unreadable',
        run: run.id,
        domain: run.domain,
        error: err instanceof Error ? err.message : String(err),
      })
    )
  }

  let panel: AeoGeneratedPanel
  try {
    panel = await generatePanel(
      {
        businessName: request.businessName,
        domain: run.domain,
        service: request.service,
        city: request.city,
        stateName: stateInfo(request.state)?.name ?? request.state,
        siteText,
      },
      { model: options.panelModel, call: options.modelCall }
    )
  } catch (err) {
    if (err instanceof PanelGenerationError && err.costUsd > 0) await addRunCost(run, err.costUsd)
    throw err
  }

  const stored = await db.execute(sql`
    update aeo_run
    set generated_panel = ${JSON.stringify(panel)}::jsonb,
        cost_usd = cost_usd + ${panel.costUsd}::numeric
    where id = ${run.id} and lease_token = ${run.leaseToken} and status = 'running'
    returning id
  `)
  if (stored.rows.length === 0) throw new LeaseLostError(run.id)

  return panel
}

export async function planRun(run: PlanTarget, questionCount: number, options: PlanOptions): Promise<RunPlan> {
  const request = await firstRequest(run.id)

  if (run.panelSource === 'generated') {
    const [row] = await db
      .select({ generatedPanel: aeoRun.generatedPanel })
      .from(aeoRun)
      .where(eq(aeoRun.id, run.id))
      .limit(1)
    const panel = row?.generatedPanel ?? (await generateForRun(run, request, options))
    return buildGeneratedPlan(panel, request, run.domain, questionCount)
  }

  if (!run.panelSlug) throw new PermanentRunError('canned run has no panel_slug')

  const [panel] = await db.select().from(aeoPanel).where(eq(aeoPanel.slug, run.panelSlug)).limit(1)
  if (!panel) throw new PermanentRunError(`panel '${run.panelSlug}' does not exist`)

  return buildCannedPlan(panel, request, run.domain, questionCount)
}
