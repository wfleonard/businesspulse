import { asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { aeoPanel, aeoRequest, aeoResult, aeoRun, type AeoRival, type AeoSource } from '@/lib/db/schema'
import { COMMON_DIRECTORY_DOMAINS } from './panels/common'

/**
 * The public snapshot report: what a visitor sees at /report/{publicId}.
 *
 * buildReport is pure so the numbers on the page are unit-tested; loadReport
 * only fetches.
 */

export type Verdict = 'cited' | 'directory' | 'named' | 'absent' | 'no_search' | 'error'

export type ReportResultInput = {
  category: string
  query: string
  ownCited: boolean
  nameMentioned: boolean
  directoryOnly: boolean
  rivals: AeoRival[]
  sources: AeoSource[]
  answer: string | null
  searches: number
  error: string | null
}

export type ReportSummary = {
  questionCount: number
  answeredCount: number
  citedCount: number
  /** Named in the answer without the site being cited. */
  namedCount: number
  categories: { category: string; label: string; questions: number; cited: number }[]
  rivals: { host: string; questions: number; directory: boolean }[]
  examples: {
    query: string
    label: string
    verdict: Verdict
    excerpt: string
    citedInstead: string[]
  }[]
}

const VERDICT_RANK: Verdict[] = ['cited', 'directory', 'named', 'absent', 'no_search', 'error']

/** Mirrors the verdicts in the SaxonAEO audit reports. Directory-only implies named, so it's checked first. */
export function verdictOf(result: ReportResultInput): Verdict {
  if (result.error || !result.answer) return 'error'
  if (result.ownCited) return 'cited'
  if (result.directoryOnly) return 'directory'
  if (result.nameMentioned) return 'named'
  if (result.searches === 0) return 'no_search'
  return 'absent'
}

const CATEGORY_LABELS: Record<string, string> = {
  'service-geo': 'Hiring near you',
  cost: 'Cost',
  permits: 'Permits',
  regulation: 'Rules and regulation',
  comparison: 'Comparing options',
  technical: 'How it works',
  application: 'Specific jobs',
  'vendor-selection': 'Choosing a provider',
  problem: 'Problems and fixes',
  'buyer-role': 'Who is buying',
}

/** Categories with a fixed position; everything else follows alphabetically. */
const CATEGORY_ORDER = ['service-geo', 'cost', 'permits', 'regulation']

export function categoryLabel(category: string): string {
  if (CATEGORY_LABELS[category]) return CATEGORY_LABELS[category]
  const words = category.replace(/[-_]+/g, ' ').trim()
  return words ? words[0].toUpperCase() + words.slice(1) : 'Other'
}

/** Report order for question categories; the Resource Hub's benchmarks use it too. */
export function compareCategories(a: string, b: string): number {
  const ia = CATEGORY_ORDER.indexOf(a)
  const ib = CATEGORY_ORDER.indexOf(b)
  if (ia !== -1 || ib !== -1) return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib)
  return a.localeCompare(b)
}

function isDirectory(host: string, directoryDomains: string[]): boolean {
  return directoryDomains.some((d) => host === d || host.endsWith(`.${d}`))
}

/**
 * Government and military sites answer permit and code questions; they are
 * never competitors, whatever a panel's reference list happens to include.
 */
function isPublicSector(host: string): boolean {
  return /\.(?:gov|mil)$/.test(host)
}

/**
 * Plain-text excerpt of an assistant answer: citation markers and markdown
 * removed, cut at a word boundary.
 */
export function cleanAnswer(text: string, maxChars = 700): string {
  const out = text
    .replace(/\[\d+(?:\s*[,–-]\s*\d+)*\]/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    // Spaces and tabs only: \s would also match the newline before a list and eat a blank line.
    .replace(/^[ \t]*[-*][ \t]+/gm, '• ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/ {2,}/g, ' ')
    .replace(/ +([.,;:!?])/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  if (out.length <= maxChars) return out
  const cut = out.slice(0, maxChars)
  const space = cut.lastIndexOf(' ')
  const trimmed = (space > maxChars * 0.6 ? cut.slice(0, space) : cut).replace(/[\s.,;:—-]+$/, '')
  return `${trimmed}…`
}

type Question = {
  query: string
  category: string
  verdict: Verdict
  row: ReportResultInput
  citedHosts: string[]
}

export function buildReport(
  results: ReportResultInput[],
  directoryDomains: string[] = [],
  exampleCount = 3
): ReportSummary {
  const byQuery = new Map<string, ReportResultInput[]>()
  for (const result of results) {
    const rows = byQuery.get(result.query) ?? []
    rows.push(result)
    byQuery.set(result.query, rows)
  }

  // One entry per question. With several engines, the question takes its best verdict.
  const questions: Question[] = [...byQuery.entries()]
    .map(([query, rows]) => {
      const ranked = [...rows].sort(
        (a, b) => VERDICT_RANK.indexOf(verdictOf(a)) - VERDICT_RANK.indexOf(verdictOf(b))
      )
      const citedHosts = [
        ...new Set(
          rows.flatMap((row) =>
            row.rivals.filter((r) => r.cited && !isPublicSector(r.host)).map((r) => r.host)
          )
        ),
      ]
      return { query, category: rows[0].category, verdict: verdictOf(ranked[0]), row: ranked[0], citedHosts }
    })
    .sort((a, b) => a.query.localeCompare(b.query))

  const categoryMap = new Map<string, { questions: number; cited: number }>()
  for (const q of questions) {
    const entry = categoryMap.get(q.category) ?? { questions: 0, cited: 0 }
    entry.questions++
    if (q.verdict === 'cited') entry.cited++
    categoryMap.set(q.category, entry)
  }
  const categories = [...categoryMap.entries()]
    .sort(([a], [b]) => compareCategories(a, b))
    .map(([category, counts]) => ({ category, label: categoryLabel(category), ...counts }))

  const rivalCounts = new Map<string, number>()
  for (const q of questions) {
    for (const host of q.citedHosts) rivalCounts.set(host, (rivalCounts.get(host) ?? 0) + 1)
  }
  const rivals = [...rivalCounts.entries()]
    .sort(([hostA, a], [hostB, b]) => b - a || hostA.localeCompare(hostB))
    .slice(0, 5)
    .map(([host, count]) => ({ host, questions: count, directory: isDirectory(host, directoryDomains) }))

  // Examples: a question the site won (if any), then the misses where the most
  // other sites were cited, then anything else that has an answer.
  const answered = questions.filter((q) => q.verdict !== 'error')
  const wins = answered.filter((q) => q.verdict === 'cited')
  const misses = answered
    .filter((q) => q.verdict !== 'cited' && q.citedHosts.length > 0)
    .sort((a, b) => b.citedHosts.length - a.citedHosts.length || a.query.localeCompare(b.query))

  const picks: Question[] = wins.slice(0, 1)
  for (const q of [...misses, ...answered]) {
    if (picks.length >= exampleCount) break
    if (!picks.includes(q)) picks.push(q)
  }
  const examples = picks
    .sort((a, b) => Number(a.verdict === 'cited') - Number(b.verdict === 'cited'))
    .map((q) => ({
      query: q.query,
      label: categoryLabel(q.category),
      verdict: q.verdict,
      excerpt: cleanAnswer(q.row.answer ?? ''),
      citedInstead: q.citedHosts.slice(0, 3),
    }))

  return {
    questionCount: questions.length,
    answeredCount: answered.length,
    citedCount: wins.length,
    namedCount: answered.filter((q) => q.verdict === 'named' || q.verdict === 'directory').length,
    categories,
    rivals,
    examples,
  }
}

export type LoadedReport = {
  publicId: string
  domain: string
  businessName: string
  status: (typeof aeoRun.$inferSelect)['status']
  panelSource: (typeof aeoRun.$inferSelect)['panelSource']
  finishedAt: Date | null
  engines: { engine: string; model: string | null }[]
  summary: ReportSummary | null
}

const PUBLIC_ID = /^[A-Za-z0-9_-]{24}$/

export async function loadReport(publicId: string): Promise<LoadedReport | null> {
  if (!PUBLIC_ID.test(publicId)) return null

  const [run] = await db
    .select({
      id: aeoRun.id,
      publicId: aeoRun.publicId,
      domain: aeoRun.domain,
      status: aeoRun.status,
      panelSource: aeoRun.panelSource,
      panelSlug: aeoRun.panelSlug,
      finishedAt: aeoRun.finishedAt,
    })
    .from(aeoRun)
    .where(eq(aeoRun.publicId, publicId))
    .limit(1)
  if (!run) return null

  const [request] = await db
    .select({ businessName: aeoRequest.businessName })
    .from(aeoRequest)
    .where(eq(aeoRequest.runId, run.id))
    .orderBy(asc(aeoRequest.createdAt))
    .limit(1)

  const base = {
    publicId: run.publicId,
    domain: run.domain,
    // Falls back to the domain once retention has erased the business name.
    businessName: request?.businessName || run.domain,
    status: run.status,
    panelSource: run.panelSource,
    finishedAt: run.finishedAt,
  }
  if (run.status !== 'done') return { ...base, engines: [], summary: null }

  const [results, panels] = await Promise.all([
    db
      .select({
        category: aeoResult.category,
        query: aeoResult.query,
        engine: aeoResult.engine,
        model: aeoResult.model,
        ownCited: aeoResult.ownCited,
        nameMentioned: aeoResult.nameMentioned,
        directoryOnly: aeoResult.directoryOnly,
        rivals: aeoResult.rivals,
        sources: aeoResult.sources,
        answer: aeoResult.answer,
        searches: aeoResult.searches,
        error: aeoResult.error,
      })
      .from(aeoResult)
      .where(eq(aeoResult.runId, run.id)),
    run.panelSlug
      ? db
          .select({ directoryDomains: aeoPanel.directoryDomains })
          .from(aeoPanel)
          .where(eq(aeoPanel.slug, run.panelSlug))
          .limit(1)
      : Promise.resolve([] as { directoryDomains: string[] }[]),
  ])

  const engines = [...new Map(results.map((r) => [`${r.engine}|${r.model}`, { engine: r.engine, model: r.model }])).values()]

  // Generated runs have no panel row; they were scored against the common lists.
  const directoryDomains =
    run.panelSource === 'generated' ? COMMON_DIRECTORY_DOMAINS : (panels[0]?.directoryDomains ?? [])
  return { ...base, engines, summary: buildReport(results, directoryDomains) }
}
