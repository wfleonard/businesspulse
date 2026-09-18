import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import type { AeoSource } from '@/lib/db/schema'
import { CANNED_PANELS } from '@/lib/aeo/panels'
import { categoryLabel, compareCategories } from '@/lib/aeo/report'

/**
 * Industry benchmarks: snapshot results combined per canned panel.
 *
 * Only aggregates leave this module: no business, domain, or competitor is
 * ever named, only directories (Yelp, Angi and the like). An industry is
 * published only once MIN_BENCHMARK_BUSINESSES businesses have been measured.
 * Each business counts once, by its latest finished snapshot.
 */

export const MIN_BENCHMARK_BUSINESSES = 10

export type BenchmarkRow = {
  runId: string
  domain: string
  category: string
  ownCited: boolean
  error: string | null
  sources: AeoSource[]
}

export type SourceKind = 'directory' | 'reference' | 'competitor'

export type BenchmarkSummary = {
  businesses: number
  answers: number
  /** Share of answers citing the business's own site. */
  ownCitedShare: number
  /** Businesses whose own site was cited on at least one question. */
  businessesEverCited: number
  medianCitedPerBusiness: number
  questionsPerBusiness: number
  categories: { category: string; label: string; answers: number; ownCitedShare: number }[]
  /** Share of answers citing at least one site of each kind. */
  citedInstead: Record<SourceKind, number>
  /** Directories most often cited, by share of answers. */
  topDirectories: { domain: string; share: number }[]
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return null
  }
}

function matchIn(host: string, domains: string[]): string | null {
  return domains.find((d) => host === d || host.endsWith(`.${d}`)) ?? null
}

/** Kind of a cited source other than the business itself, with the matched directory for directories. */
export function classifySource(
  host: string,
  lists: { directoryDomains: string[]; referenceDomains: string[] }
): { kind: SourceKind; directory?: string } {
  const directory = matchIn(host, lists.directoryDomains)
  if (directory) return { kind: 'directory', directory }
  if (/\.(?:gov|mil|edu)$/.test(host) || matchIn(host, lists.referenceDomains)) return { kind: 'reference' }
  return { kind: 'competitor' }
}

const share = (count: number, total: number) => (total > 0 ? count / total : 0)

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function summarizeBenchmark(
  rows: BenchmarkRow[],
  lists: { directoryDomains: string[]; referenceDomains: string[] }
): BenchmarkSummary {
  const answered = rows.filter((r) => !r.error)
  const perBusiness = new Map<string, { answers: number; cited: number }>()
  const perCategory = new Map<string, { answers: number; cited: number }>()
  const instead: Record<SourceKind, number> = { directory: 0, reference: 0, competitor: 0 }
  const directoryAnswers = new Map<string, number>()

  for (const row of answered) {
    for (const [map, key] of [
      [perBusiness, row.runId],
      [perCategory, row.category],
    ] as const) {
      const entry = map.get(key) ?? { answers: 0, cited: 0 }
      entry.answers++
      if (row.ownCited) entry.cited++
      map.set(key, entry)
    }

    const kinds = new Set<SourceKind>()
    const directories = new Set<string>()
    for (const source of row.sources) {
      if (!source.cited) continue
      const host = hostOf(source.url)
      if (!host || host === row.domain || host.endsWith(`.${row.domain}`)) continue
      const { kind, directory } = classifySource(host, lists)
      kinds.add(kind)
      if (directory) directories.add(directory)
    }
    for (const kind of kinds) instead[kind]++
    for (const directory of directories) directoryAnswers.set(directory, (directoryAnswers.get(directory) ?? 0) + 1)
  }

  const businesses = [...perBusiness.values()]
  const totalCited = businesses.reduce((sum, b) => sum + b.cited, 0)

  return {
    businesses: businesses.length,
    answers: answered.length,
    ownCitedShare: share(totalCited, answered.length),
    businessesEverCited: businesses.filter((b) => b.cited > 0).length,
    medianCitedPerBusiness: median(businesses.map((b) => b.cited)),
    questionsPerBusiness: businesses.length ? Math.round(answered.length / businesses.length) : 0,
    categories: [...perCategory.entries()]
      .sort(([a], [b]) => compareCategories(a, b))
      .map(([category, c]) => ({
        category,
        label: categoryLabel(category),
        answers: c.answers,
        ownCitedShare: share(c.cited, c.answers),
      })),
    citedInstead: {
      directory: share(instead.directory, answered.length),
      reference: share(instead.reference, answered.length),
      competitor: share(instead.competitor, answered.length),
    },
    topDirectories: [...directoryAnswers.entries()]
      .sort(([da, a], [db, b]) => b - a || da.localeCompare(db))
      .slice(0, 5)
      .map(([domain, count]) => ({ domain, share: share(count, answered.length) })),
  }
}

/** Snapshots that count: finished, canned, from a verified request; latest per business. */
const COUNTED_RUNS = sql`
  select distinct on (r.domain) r.id, r.domain, r.panel_slug, r.finished_at
  from aeo_run r
  where r.status = 'done'
    and r.tier = 'snapshot'
    and r.panel_source = 'canned'
    and exists (select 1 from aeo_request q where q.run_id = r.id and q.verified_at is not null)
  order by r.domain, r.finished_at desc
`

export type BenchmarkAvailability = {
  slug: string
  name: string
  businesses: number
  available: boolean
  lastMeasured: Date | null
}

export async function benchmarkAvailability(): Promise<BenchmarkAvailability[]> {
  const result = await db.execute(sql`
    with counted as (${COUNTED_RUNS})
    select panel_slug, count(*)::int as businesses, max(finished_at) as last
    from counted group by panel_slug
  `)
  const byPanel = new Map(
    (result.rows as { panel_slug: string; businesses: number; last: Date | string | null }[]).map((r) => [
      r.panel_slug,
      r,
    ])
  )
  return CANNED_PANELS.map((panel) => {
    const row = byPanel.get(panel.slug)
    const businesses = Number(row?.businesses ?? 0)
    return {
      slug: panel.slug,
      name: panel.name,
      businesses,
      available: businesses >= MIN_BENCHMARK_BUSINESSES,
      lastMeasured: row?.last ? new Date(row.last) : null,
    }
  }).sort((a, b) => a.name.localeCompare(b.name))
}

export type Benchmark = {
  slug: string
  name: string
  summary: BenchmarkSummary
  measuredFrom: Date
  measuredTo: Date
}

/** The industry's benchmark, or null when the industry is unknown or has too few businesses. */
export async function loadBenchmark(slug: string): Promise<Benchmark | null> {
  const panel = CANNED_PANELS.find((p) => p.slug === slug)
  if (!panel) return null

  const result = await db.execute(sql`
    with counted as (${COUNTED_RUNS})
    select x.run_id, c.domain, c.finished_at, x.category, x.own_cited, x.error, x.sources
    from aeo_result x
    join counted c on c.id = x.run_id
    where c.panel_slug = ${slug}
  `)
  const rows = result.rows as {
    run_id: string
    domain: string
    finished_at: Date | string
    category: string
    own_cited: boolean
    error: string | null
    sources: AeoSource[]
  }[]

  const summary = summarizeBenchmark(
    rows.map((r) => ({
      runId: String(r.run_id),
      domain: r.domain,
      category: r.category,
      ownCited: r.own_cited,
      error: r.error,
      sources: r.sources ?? [],
    })),
    panel
  )
  if (summary.businesses < MIN_BENCHMARK_BUSINESSES) return null

  const times = rows.map((r) => new Date(r.finished_at).getTime())
  return {
    slug: panel.slug,
    name: panel.name,
    summary,
    measuredFrom: new Date(Math.min(...times)),
    measuredTo: new Date(Math.max(...times)),
  }
}
