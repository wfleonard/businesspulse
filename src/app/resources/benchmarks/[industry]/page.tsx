import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { GoogleAnalytics } from '@/components/GoogleAnalytics'
import { JsonLd } from '@/components/resources/JsonLd'
import { SnapshotCta } from '@/components/resources/SnapshotCta'
import { Card } from '@/components/ui/Card'
import { PublicHeader } from '@/components/site/PublicHeader'
import { appUrl } from '@/lib/aeo/emails'
import { formatDay } from '@/lib/resources'
import { loadBenchmark, MIN_BENCHMARK_BUSINESSES, type Benchmark } from '@/lib/resources/benchmarks'
import { articleJsonLd } from '@/lib/resources/json-ld'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ industry: string }> }

const pct = (share: number) => `${Math.round(share * 100)}%`

function titleOf(benchmark: Benchmark): string {
  return `How AI search answers ${benchmark.name.toLowerCase()} buyers`
}

function summaryOf(benchmark: Benchmark): string {
  const s = benchmark.summary
  return `Across ${s.businesses} ${benchmark.name.toLowerCase()} businesses, AI search cited the business's own website on ${pct(s.ownCitedShare)} of buyer questions, and ${s.businessesEverCited} of ${s.businesses} were cited at least once.`
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const benchmark = await loadBenchmark((await params).industry)
  if (!benchmark) return {}
  const url = appUrl(`/resources/benchmarks/${benchmark.slug}`)
  return {
    title: `${titleOf(benchmark)} | BusinessPulse`,
    description: summaryOf(benchmark),
    alternates: { canonical: url },
    openGraph: { title: titleOf(benchmark), description: summaryOf(benchmark), url, type: 'article' },
  }
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-text-secondary">{label}</p>
      <p className="mt-1 text-2xl font-bold text-dark">{value}</p>
      {note && <p className="mt-1 text-xs text-text-secondary">{note}</p>}
    </Card>
  )
}

export default async function BenchmarkPage({ params }: Props) {
  const benchmark = await loadBenchmark((await params).industry)
  if (!benchmark) notFound()

  const s = benchmark.summary
  const period =
    formatDay(benchmark.measuredFrom) === formatDay(benchmark.measuredTo)
      ? `on ${formatDay(benchmark.measuredTo)}`
      : `between ${formatDay(benchmark.measuredFrom)} and ${formatDay(benchmark.measuredTo)}`

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:py-14">
        <Link href="/resources?type=benchmark" className="text-sm text-primary hover:underline">
          Industry benchmarks
        </Link>
        <p className="mt-4 text-xs text-text-secondary">Industry benchmark · Updated {formatDay(benchmark.measuredTo)}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-dark sm:text-4xl">{titleOf(benchmark)}</h1>
        <p className="mt-4 text-lg text-text-secondary">{summaryOf(benchmark)}</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Stat label="Businesses measured" value={String(s.businesses)} note={`About ${s.questionsPerBusiness} questions each`} />
          <Stat label="Answers citing the business's own site" value={pct(s.ownCitedShare)} />
          <Stat label="Cited on at least one question" value={`${s.businessesEverCited} of ${s.businesses}`} />
          <Stat
            label="Typical business"
            value={`${s.medianCitedPerBusiness} of ${s.questionsPerBusiness}`}
            note="Median questions citing its own site"
          />
        </div>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-dark">By type of question</h2>
          <p className="mt-1 text-sm text-text-secondary">How often answers cited the business&apos;s own website.</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {s.categories.map((c) => (
                  <tr key={c.category} className="border-b border-border last:border-0">
                    <td className="py-2 pr-4 text-dark">{c.label}</td>
                    <td className="w-1/2 py-2 pr-4">
                      <div className="h-2 rounded bg-gray-100">
                        <div className="h-2 rounded bg-primary" style={{ width: pct(c.ownCitedShare) }} />
                      </div>
                    </td>
                    <td className="whitespace-nowrap py-2 text-right text-text-secondary">
                      {pct(c.ownCitedShare)} of {c.answers}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-dark">What gets cited instead</h2>
          <p className="mt-1 text-sm text-text-secondary">Share of answers citing at least one site of each kind.</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex justify-between gap-4">
              <span className="text-dark">Other businesses in the industry</span>
              <span className="text-text-secondary">{pct(s.citedInstead.competitor)}</span>
            </li>
            <li className="flex justify-between gap-4">
              <span className="text-dark">Directories and listing sites</span>
              <span className="text-text-secondary">{pct(s.citedInstead.directory)}</span>
            </li>
            <li className="flex justify-between gap-4">
              <span className="text-dark">Government, reference, trade press, and manufacturers</span>
              <span className="text-text-secondary">{pct(s.citedInstead.reference)}</span>
            </li>
          </ul>
          {s.topDirectories.length > 0 && (
            <p className="mt-4 text-sm text-text-secondary">
              Directories cited most often:{' '}
              <span className="text-dark">
                {s.topDirectories.map((d) => `${d.domain} (${pct(d.share)})`).join(', ')}
              </span>
            </p>
          )}
        </section>

        <section className="mt-10 text-sm leading-relaxed text-text-secondary">
          <h2 className="text-base font-semibold text-dark">How this was measured</h2>
          <p className="mt-2">
            Combined from BusinessPulse snapshots {period}: {s.answers} answers from Perplexity with live web search, to
            questions from our {benchmark.name.toLowerCase()} question set filled in for each business&apos;s service
            and area. Each business counts once, by its latest snapshot. No business is named, and an industry is
            published only once {MIN_BENCHMARK_BUSINESSES} businesses have been measured. One assistant on these dates
            is a snapshot, not a ranking.{' '}
            <Link href="/resources/how-businesspulse-measures-ai-visibility" className="text-primary hover:underline">
              Read the full method
            </Link>
            .
          </p>
        </section>

        <SnapshotCta />
      </main>
      <JsonLd
        data={articleJsonLd({
          path: `/resources/benchmarks/${benchmark.slug}`,
          title: titleOf(benchmark),
          description: summaryOf(benchmark),
          published: benchmark.measuredFrom,
          modified: benchmark.measuredTo,
        })}
      />
      <GoogleAnalytics />
    </div>
  )
}
