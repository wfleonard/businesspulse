import type { AeoRival } from '@/lib/db/schema'
import { normalizeDomain } from './domain'
import { COMMON_DIRECTORY_DOMAINS, COMMON_REFERENCE_DOMAINS } from './panels/common'
import { buildCannedPlan } from './plan'
import { CATEGORY_MINIMUMS, type PanelQuestion } from './questions'

/**
 * Panel content rules and the "learn from runs" suggestions. Pure functions,
 * shared by the dashboard, the Claude drafts, and the canned panel tests.
 */

export type PanelContent = {
  name: string
  questions: PanelQuestion[]
  directoryDomains: string[]
  referenceDomains: string[]
}

/** Slots plan.ts can fill. A question with any other slot would never be asked. */
export const PANEL_SLOTS = new Set(['business', 'service', 'city', 'state', 'state_permit_agency'])

export const MAX_QUESTION_LENGTH = 150

/** Snapshots ask this many questions, so a panel needs at least this many that can be filled. */
const SNAPSHOT_QUESTIONS = 20

/** Same question, ignoring case and spacing. */
function questionKey(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim()
}

function matchesDomain(host: string, domains: Iterable<string>): boolean {
  for (const d of domains) if (host === d || host.endsWith(`.${d}`)) return true
  return false
}

/**
 * Problems that would stop a panel from being published or saved, in plain
 * words. Empty means the panel is usable.
 */
export function validatePanelContent(content: PanelContent): string[] {
  const problems: string[] = []
  if (!content.name.trim()) problems.push('The panel needs a name.')

  const seen = new Set<string>()
  for (const { c, q } of content.questions) {
    if (!/^[a-z]+(?:-[a-z]+)*$/.test(c)) problems.push(`Category "${c}" isn't lowercase-with-hyphens.`)
    if (q.length > MAX_QUESTION_LENGTH) problems.push(`Too long (over ${MAX_QUESTION_LENGTH} characters): "${q}"`)
    for (const [, slot] of q.matchAll(/\{([a-z_]+)\}/g)) {
      if (!PANEL_SLOTS.has(slot)) problems.push(`Unknown slot {${slot}} in "${q}"`)
    }
    const key = questionKey(q)
    if (seen.has(key)) problems.push(`Asked twice: "${q}"`)
    seen.add(key)
  }

  for (const [label, list] of [
    ['directory', content.directoryDomains],
    ['reference', content.referenceDomains],
  ] as const) {
    if (new Set(list).size !== list.length) problems.push(`The ${label} domain list has duplicates.`)
    for (const domain of list) {
      if (normalizeDomain(domain) !== domain) problems.push(`"${domain}" isn't a bare domain like "example.com".`)
    }
  }

  // Sample a snapshot the way a real run would, for a state with a permit agency.
  if (problems.length === 0) {
    const plan = buildCannedPlan(
      { ...content, version: 1 },
      { businessName: 'Sample Business LLC', service: 'sample service', city: 'Fair Haven', state: 'NJ' },
      'example.com',
      SNAPSHOT_QUESTIONS
    )
    if (plan.questions.length < SNAPSHOT_QUESTIONS) {
      problems.push(`A snapshot asks ${SNAPSHOT_QUESTIONS} questions; this panel only fills ${plan.questions.length}.`)
    }
    for (const [category, minimum] of Object.entries(CATEGORY_MINIMUMS)) {
      if (content.questions.filter((q) => q.c === category).length < minimum) continue
      const sampled = plan.questions.filter((q) => q.c === category).length
      if (sampled < minimum) problems.push(`Snapshots should carry ${minimum} "${category}" questions; only ${sampled} fit.`)
    }
  }

  return problems
}

/** Clean, de-duplicated, normalized domains; anything that isn't a domain is dropped. */
export function cleanDomains(domains: string[]): string[] {
  return [...new Set(domains.map((d) => normalizeDomain(d)).filter(Boolean))]
}

/**
 * A pattern matching the questions a template becomes once its slots are
 * filled. Results store the filled text, so this maps them back.
 */
export function templatePattern(template: string): RegExp {
  const parts = template.split(/\{[a-z_]+\}/)
  const body = parts.map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')).join('.+?')
  return new RegExp(`^\\s*${body}\\s*$`, 'i')
}

/** One answer from a finished canned-panel run, as the suggestions need it. */
export type PanelRunRow = {
  runId: string
  domain: string
  otherDomains: string[]
  query: string
  ownCited: boolean
  rivals: AeoRival[]
  error: string | null
}

export type DomainSuggestion = {
  host: string
  /** Different businesses whose answers cited it: a local rival rarely shows up for more than one. */
  businesses: number
  citations: number
  title: string
}

export type QuestionStat = {
  question: PanelQuestion
  /** Runs that asked it. */
  asked: number
  answered: number
  ownCited: number
  /** Answers that cited no business at all: only reference sites, directories, or nothing. */
  noBusinessCited: number
  /** Asked often enough, and almost never cites a business, so it can't show who is visible. */
  weak: boolean
}

export type PanelRunSummary = {
  runs: number
  domains: DomainSuggestion[]
  questions: QuestionStat[]
}

/** A question needs this many runs before it can be called weak. */
export const WEAK_MIN_ASKED = 3
/** Share of answers citing no business at which a question is weak. */
export const WEAK_SHARE = 0.8
const MAX_DOMAIN_SUGGESTIONS = 30

/**
 * What a panel's finished runs say about it:
 *
 * - Domains cited for two or more different businesses that the panel doesn't
 *   list yet. Usually a directory, a reference site, or a national brand that
 *   should be classified so reports stop calling it a rival.
 * - Per question: how often it was asked and how often its answers cited any
 *   business. A question that never does can't show who is visible.
 */
export function summarizePanelRuns(
  panel: PanelContent & { dismissedDomains: string[] },
  rows: PanelRunRow[]
): PanelRunSummary {
  const known = [
    ...panel.directoryDomains,
    ...panel.referenceDomains,
    ...COMMON_DIRECTORY_DOMAINS,
    ...COMMON_REFERENCE_DOMAINS,
  ]
  const isNonBusiness = (host: string) => /\.(?:gov|mil|edu)$/.test(host) || matchesDomain(host, known)

  const domainStats = new Map<string, { businesses: Set<string>; citations: number; title: string }>()
  const patterns = panel.questions.map((question) => ({ question, pattern: templatePattern(question.q) }))
  const questionStats = new Map<PanelQuestion, { runs: Set<string>; answered: number; ownCited: number; none: number }>()
  const runs = new Set<string>()

  for (const row of rows) {
    runs.add(row.runId)
    const own = [row.domain, ...row.otherDomains]
    const businessHosts = row.rivals
      .filter((r) => r.cited)
      .map((r) => r.host.replace(/^www\./, '').toLowerCase())
      .filter((host) => !matchesDomain(host, own) && !isNonBusiness(host))

    for (const rival of row.rivals) {
      const host = rival.host.replace(/^www\./, '').toLowerCase()
      if (!rival.cited || !businessHosts.includes(host)) continue
      if (matchesDomain(host, panel.dismissedDomains)) continue
      const entry = domainStats.get(host) ?? { businesses: new Set<string>(), citations: 0, title: rival.title }
      entry.businesses.add(row.domain)
      entry.citations++
      domainStats.set(host, entry)
    }

    const match = patterns.find((p) => p.pattern.test(row.query))
    if (!match) continue
    const stat = questionStats.get(match.question) ?? { runs: new Set<string>(), answered: 0, ownCited: 0, none: 0 }
    stat.runs.add(row.runId)
    if (!row.error) {
      stat.answered++
      if (row.ownCited) stat.ownCited++
      if (!row.ownCited && businessHosts.length === 0) stat.none++
    }
    questionStats.set(match.question, stat)
  }

  const domains = [...domainStats.entries()]
    .filter(([, s]) => s.businesses.size >= 2)
    .map(([host, s]) => ({ host, businesses: s.businesses.size, citations: s.citations, title: s.title }))
    .sort((a, b) => b.businesses - a.businesses || b.citations - a.citations || a.host.localeCompare(b.host))
    .slice(0, MAX_DOMAIN_SUGGESTIONS)

  const questions = panel.questions.map((question) => {
    const s = questionStats.get(question)
    const asked = s?.runs.size ?? 0
    const answered = s?.answered ?? 0
    const noBusinessCited = s?.none ?? 0
    return {
      question,
      asked,
      answered,
      ownCited: s?.ownCited ?? 0,
      noBusinessCited,
      weak: asked >= WEAK_MIN_ASKED && answered > 0 && noBusinessCited / answered >= WEAK_SHARE,
    }
  })

  return { runs: runs.size, domains, questions }
}

export type PanelChanges = {
  addDirectory: string[]
  addReference: string[]
  /** Question templates, exactly as stored. */
  removeQuestions: string[]
}

export function applyPanelChanges(content: PanelContent, changes: PanelChanges): PanelContent {
  const remove = new Set(changes.removeQuestions)
  const addDirectory = cleanDomains(changes.addDirectory)
  const addReference = cleanDomains(changes.addReference).filter((d) => !addDirectory.includes(d))
  return {
    name: content.name,
    questions: content.questions.filter((q) => !remove.has(q.q)),
    directoryDomains: [...new Set([...content.directoryDomains, ...addDirectory])],
    referenceDomains: [...new Set([...content.referenceDomains, ...addReference])],
  }
}

/** Stable comparison key: two panels with the same key ask and score the same way. */
export function contentKey(content: PanelContent): string {
  return JSON.stringify({
    name: content.name,
    questions: content.questions,
    directoryDomains: content.directoryDomains,
    referenceDomains: content.referenceDomains,
  })
}

/** What changed between two versions, for the history list. */
export function describeChange(before: PanelContent | null, after: PanelContent): string {
  if (!before) return `${after.questions.length} questions`
  const beforeQ = new Set(before.questions.map((q) => q.q))
  const afterQ = new Set(after.questions.map((q) => q.q))
  const parts: string[] = []
  const added = [...afterQ].filter((q) => !beforeQ.has(q)).length
  const removed = [...beforeQ].filter((q) => !afterQ.has(q)).length
  if (added) parts.push(`+${added} questions`)
  if (removed) parts.push(`-${removed} questions`)
  const domainDelta = (a: string[], b: string[]) => b.filter((d) => !a.includes(d)).length - a.filter((d) => !b.includes(d)).length
  const dir = domainDelta(before.directoryDomains, after.directoryDomains)
  const ref = domainDelta(before.referenceDomains, after.referenceDomains)
  if (dir) parts.push(`${dir > 0 ? '+' : ''}${dir} directory domains`)
  if (ref) parts.push(`${ref > 0 ? '+' : ''}${ref} reference domains`)
  if (before.name !== after.name) parts.push('renamed')
  return parts.join(', ') || 'no content change'
}
