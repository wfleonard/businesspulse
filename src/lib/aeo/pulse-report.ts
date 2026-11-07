import { categoryLabel, cleanAnswer, compareCategories, verdictOf, type ReportResultInput, type Verdict } from './report'

/**
 * The Pulse report a client reads in their account (docs/pulse-plan.md §4.4).
 * Pure, like buildReport: every number on the page comes from here and is
 * unit-tested. Unlike the snapshot report, each question keeps every
 * assistant's answer, so the client sees who cites them and who doesn't.
 */

export type PulseResultInput = ReportResultInput & { engine: string }

export const ENGINE_LABELS: Record<string, string> = {
  openai: 'ChatGPT',
  claude: 'Claude',
  perplexity: 'Perplexity',
  gemini: 'Gemini',
}
const ENGINE_ORDER = ['openai', 'claude', 'perplexity', 'gemini']

export type EngineAnswer = { engine: string; label: string; verdict: Verdict; answer: string; citedInstead: string[] }

export type PulseQuestion = {
  query: string
  category: string
  label: string
  offering: string
  /** Best verdict across assistants. */
  verdict: Verdict
  /** How many assistants cited the site. */
  citedBy: number
  answers: EngineAnswer[]
}

export type PulseSummary = {
  questionCount: number
  /** Questions at least one assistant answered. */
  answeredCount: number
  /** Questions where at least one assistant cited the site. */
  citedCount: number
  /** Named by at least one assistant, cited by none. */
  namedCount: number
  engines: { engine: string; label: string; answered: number; cited: number }[]
  categories: { category: string; label: string; questions: number; cited: number }[]
  offerings: { offering: string; questions: number; cited: number }[]
  rivals: { host: string; questions: number; directory: boolean }[]
  questions: PulseQuestion[]
}

export type PulseTrend = {
  previousDate: Date
  previousCited: number
  previousQuestions: number
  /** True when both runs asked the same panel version, so questions compare one to one. */
  samePanel: boolean
  engines: { engine: string; label: string; before: number; now: number }[]
  /** Same panel only: questions cited now but not before, and the reverse. */
  gained: string[]
  lost: string[]
}

/**
 * How the "looking for a provider" type reads: a business that ships
 * nationwide is found by people looking for where to buy, not to hire.
 */
export function pulseCategoryLabel(category: string, seller: boolean): string {
  if (seller && category === 'service-geo') return 'Finding where to buy'
  if (seller && category === 'application') return 'Specific uses'
  if (seller && category === 'vendor-selection') return 'Choosing a seller'
  return categoryLabel(category)
}

function isDirectory(host: string, directoryDomains: readonly string[]): boolean {
  return directoryDomains.some((d) => host === d || host.endsWith(`.${d}`))
}

const VERDICT_RANK: Verdict[] = ['cited', 'directory', 'named', 'absent', 'no_search', 'error']

export function buildPulseReport(
  results: PulseResultInput[],
  options: { offerings?: Map<string, string>; directoryDomains?: string[]; seller?: boolean } = {}
): PulseSummary {
  const directoryDomains = options.directoryDomains ?? []
  const seller = options.seller ?? false
  const byQuery = new Map<string, PulseResultInput[]>()
  for (const r of results) byQuery.set(r.query, [...(byQuery.get(r.query) ?? []), r])

  const questions: PulseQuestion[] = [...byQuery.entries()].map(([query, rows]) => {
    const answers = rows
      .map((row) => ({
        engine: row.engine,
        label: ENGINE_LABELS[row.engine] ?? row.engine,
        verdict: verdictOf(row),
        answer: cleanAnswer(row.answer ?? '', Number.POSITIVE_INFINITY),
        citedInstead: [...new Set(row.rivals.filter((r) => r.cited && !/\.(gov|mil)$/.test(r.host)).map((r) => r.host))],
      }))
      .sort((a, b) => ENGINE_ORDER.indexOf(a.engine) - ENGINE_ORDER.indexOf(b.engine))
    const verdict = answers.map((a) => a.verdict).sort((a, b) => VERDICT_RANK.indexOf(a) - VERDICT_RANK.indexOf(b))[0]
    return {
      query,
      category: rows[0].category,
      label: pulseCategoryLabel(rows[0].category, seller),
      offering: options.offerings?.get(query) ?? 'general',
      verdict,
      citedBy: answers.filter((a) => a.verdict === 'cited').length,
      answers,
    }
  })
  questions.sort((a, b) => compareCategories(a.category, b.category) || a.query.localeCompare(b.query))

  const answered = questions.filter((q) => q.verdict !== 'error')

  const engineSet = [...new Set(results.map((r) => r.engine))].sort((a, b) => ENGINE_ORDER.indexOf(a) - ENGINE_ORDER.indexOf(b))
  const engines = engineSet.map((engine) => {
    const own = questions.map((q) => q.answers.find((a) => a.engine === engine)).filter((a): a is EngineAnswer => Boolean(a))
    return {
      engine,
      label: ENGINE_LABELS[engine] ?? engine,
      answered: own.filter((a) => a.verdict !== 'error').length,
      cited: own.filter((a) => a.verdict === 'cited').length,
    }
  })

  const tally = <K extends string>(key: (q: PulseQuestion) => K) => {
    const map = new Map<K, { questions: number; cited: number }>()
    for (const q of answered) {
      const entry = map.get(key(q)) ?? { questions: 0, cited: 0 }
      entry.questions++
      if (q.verdict === 'cited') entry.cited++
      map.set(key(q), entry)
    }
    return map
  }
  const categories = [...tally((q) => q.category).entries()]
    .sort(([a], [b]) => compareCategories(a, b))
    .map(([category, c]) => ({ category, label: pulseCategoryLabel(category, seller), ...c }))
  const offerings = [...tally((q) => q.offering).entries()]
    .sort(([a, x], [b, y]) => (a === 'general' ? 1 : b === 'general' ? -1 : y.questions - x.questions))
    .map(([offering, c]) => ({ offering, ...c }))

  const rivalCounts = new Map<string, number>()
  for (const q of answered) {
    for (const host of new Set(q.answers.flatMap((a) => a.citedInstead))) rivalCounts.set(host, (rivalCounts.get(host) ?? 0) + 1)
  }
  const rivals = [...rivalCounts.entries()]
    .sort(([ha, a], [hb, b]) => b - a || ha.localeCompare(hb))
    .slice(0, 10)
    .map(([host, count]) => ({ host, questions: count, directory: isDirectory(host, directoryDomains) }))

  return {
    questionCount: questions.length,
    answeredCount: answered.length,
    citedCount: answered.filter((q) => q.verdict === 'cited').length,
    namedCount: answered.filter((q) => q.verdict === 'named' || q.verdict === 'directory').length,
    engines,
    categories,
    offerings,
    rivals,
    questions,
  }
}

/** Compare a run with the business's previous Pulse run. */
export function buildTrend(
  now: PulseSummary,
  before: PulseSummary,
  meta: { previousDate: Date; samePanel: boolean }
): PulseTrend {
  const citedNow = new Set(now.questions.filter((q) => q.verdict === 'cited').map((q) => q.query))
  const citedBefore = new Set(before.questions.filter((q) => q.verdict === 'cited').map((q) => q.query))
  return {
    previousDate: meta.previousDate,
    previousCited: before.citedCount,
    previousQuestions: before.answeredCount,
    samePanel: meta.samePanel,
    engines: now.engines.map((e) => ({
      engine: e.engine,
      label: e.label,
      before: before.engines.find((b) => b.engine === e.engine)?.cited ?? 0,
      now: e.cited,
    })),
    gained: meta.samePanel ? [...citedNow].filter((q) => !citedBefore.has(q)) : [],
    lost: meta.samePanel ? [...citedBefore].filter((q) => !citedNow.has(q)) : [],
  }
}
