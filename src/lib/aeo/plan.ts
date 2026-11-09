import { asc, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { aeoPanel, aeoRequest, aeoRun, business, businessPanel, type AeoGeneratedPanel } from '@/lib/db/schema'
import { generatePanel, PanelGenerationError, type ModelCall } from './generate'
import { COMMON_DIRECTORY_DOMAINS, COMMON_REFERENCE_DOMAINS } from './panels/common'
import { fillSlots, sampleQuestions, type PanelQuestion } from './questions'
import { LeaseLostError } from './queue'
import { crawlSite } from './crawl'
import { knownIndustries, recordPanelDemand } from './panel-demand'
import { extractText, type FetchedPage } from './site'
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
  /** Other sites the business runs; the panel scores citations of them as its own. */
  otherDomains: string[]
  directoryDomains: string[]
  referenceDomains: string[]
  questions: PanelQuestion[]
  panelVersion: number | null
}

export type PlanTarget = {
  id: string
  domain: string
  /** Absent on runs claimed before the column existed; treated as none. */
  otherDomains?: string[]
  panelSource: 'canned' | 'generated' | 'business'
  panelSlug: string | null
  /** Pulse runs: questions are filled from this business's profile instead of a request. */
  businessId?: string | null
  /** Pulse runs on a business panel: the approved version to ask. */
  businessPanelId?: string | null
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
    otherDomains: [],
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
    otherDomains: [],
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
    if (options.fetchSite) {
      // Tests: one page.
      siteText = extractText((await options.fetchSite(run.domain)).html) || null
    } else {
      // Up to a dozen pages that say what the business does, not just the homepage.
      siteText = siteTextFromPages((await crawlSite(run.domain, run.otherDomains ?? [], { maxPages: SNAPSHOT_PAGES })).pages)
    }
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
        stateCode: stateInfo(request.state)?.code,
        siteText,
        knownIndustries: options.modelCall ? [] : await knownIndustries().catch(() => []),
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

  // Count this business toward a panel for its industry. Best effort: it never holds up the report.
  if (panel.industry && !options.modelCall) {
    try {
      const demand = await recordPanelDemand(panel.industry, run.domain)
      if (demand.recorded) {
        console.log(JSON.stringify({ at: new Date().toISOString(), event: 'panel_demand', run: run.id, ...demand }))
      }
    } catch (err) {
      console.warn(JSON.stringify({ at: new Date().toISOString(), event: 'panel_demand_error', run: run.id, error: err instanceof Error ? err.message : String(err) }))
    }
  }

  return panel
}

/** Pages a free snapshot reads to write its questions when no industry panel fits. */
const SNAPSHOT_PAGES = 12
/** About 7,500 words: enough to see what a business sells without a large prompt. */
const SNAPSHOT_SITE_CHARS = 30_000

/** The crawled pages as one quoted text, homepage first, each under its address. */
export function siteTextFromPages(pages: { url: string; title: string; text: string }[]): string | null {
  let out = ''
  for (const page of pages) {
    if (!page.text) continue
    const block = `Page: ${new URL(page.url).pathname}${page.title ? ` (${page.title})` : ''}\n${page.text}\n\n`
    if (out.length + block.length > SNAPSHOT_SITE_CHARS) {
      if (!out) out = block.slice(0, SNAPSHOT_SITE_CHARS)
      break
    }
    out += block
  }
  return out.trim() || null
}

/** A Pulse run's plan: the business's industry questions, filled from its profile. */
async function planBusinessRun(run: PlanTarget & { businessId: string }, questionCount: number): Promise<RunPlan> {
  const [owner] = await db.select().from(business).where(eq(business.id, run.businessId)).limit(1)
  if (!owner) throw new PermanentRunError('the business for this run no longer exists')

  if (run.panelSource === 'business') {
    // The business's own panel: questions are already written for it, with no slots.
    if (!run.businessPanelId) throw new PermanentRunError('this run has no business panel')
    const [panel] = await db.select().from(businessPanel).where(eq(businessPanel.id, run.businessPanelId)).limit(1)
    if (!panel) throw new PermanentRunError('the business panel for this run no longer exists')
    const questions = panel.questions.slice(0, questionCount).map(({ c, q }) => ({ c, q }))
    if (questions.length === 0) throw new PermanentRunError('the business panel has no questions')
    return {
      businessName: owner.name,
      domain: run.domain,
      otherDomains: run.otherDomains ?? [],
      directoryDomains: panel.directoryDomains,
      referenceDomains: panel.referenceDomains,
      questions,
      panelVersion: panel.version,
    }
  }

  if (run.panelSource !== 'canned' || !run.panelSlug) {
    // Custom industries get an approved full question set first (docs/pulse-plan.md, P7).
    throw new PermanentRunError('this business has no approved question set yet')
  }
  const [panel] = await db.select().from(aeoPanel).where(eq(aeoPanel.slug, run.panelSlug)).limit(1)
  if (!panel) throw new PermanentRunError(`panel '${run.panelSlug}' does not exist`)

  const profile = { businessName: owner.name, service: owner.service, city: owner.city, state: owner.state }
  return { ...buildCannedPlan(panel, profile, run.domain, questionCount), otherDomains: run.otherDomains ?? [] }
}

export async function planRun(run: PlanTarget, questionCount: number, options: PlanOptions): Promise<RunPlan> {
  if (run.businessId) return planBusinessRun({ ...run, businessId: run.businessId }, questionCount)

  const request = await firstRequest(run.id)

  if (run.panelSource === 'generated') {
    const [row] = await db
      .select({ generatedPanel: aeoRun.generatedPanel })
      .from(aeoRun)
      .where(eq(aeoRun.id, run.id))
      .limit(1)
    const panel = row?.generatedPanel ?? (await generateForRun(run, request, options))
    return { ...buildGeneratedPlan(panel, request, run.domain, questionCount), otherDomains: run.otherDomains ?? [] }
  }

  if (!run.panelSlug) throw new PermanentRunError('canned run has no panel_slug')

  const [panel] = await db.select().from(aeoPanel).where(eq(aeoPanel.slug, run.panelSlug)).limit(1)
  if (!panel) throw new PermanentRunError(`panel '${run.panelSlug}' does not exist`)

  return { ...buildCannedPlan(panel, request, run.domain, questionCount), otherDomains: run.otherDomains ?? [] }
}
