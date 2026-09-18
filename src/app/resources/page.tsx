import type { Metadata } from 'next'
import Link from 'next/link'
import { GoogleAnalytics } from '@/components/GoogleAnalytics'
import { SnapshotCta } from '@/components/resources/SnapshotCta'
import { PublicHeader } from '@/components/site/PublicHeader'
import { appUrl } from '@/lib/aeo/emails'
import { benchmarkAvailability, type BenchmarkAvailability } from '@/lib/resources/benchmarks'
import {
  articleDate,
  formatDay,
  industryName,
  parseHubFilters,
  publishedArticles,
  RESOURCE_TYPE_LABELS,
  type HubFilters,
  type ResourceType,
} from '@/lib/resources'

export const dynamic = 'force-dynamic'

const DESCRIPTION =
  'What we are learning about how AI search answers buyers, industry by industry: benchmarks, guides, and our method.'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Resources | BusinessPulse',
    description: DESCRIPTION,
    alternates: { canonical: appUrl('/resources') },
    openGraph: { title: 'BusinessPulse Resources', description: DESCRIPTION, url: appUrl('/resources'), type: 'website' },
  }
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

type Item = {
  href: string
  type: ResourceType
  title: string
  summary: string
  date: Date
  industries: string[]
}

function hubHref(filters: HubFilters): string {
  const params = new URLSearchParams()
  if (filters.type) params.set('type', filters.type)
  if (filters.industry) params.set('industry', filters.industry)
  const query = params.toString()
  return query ? `/resources?${query}` : '/resources'
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`rounded-full border px-3 py-1 text-xs ${
        active ? 'border-primary bg-primary text-white' : 'border-border bg-white text-dark hover:border-primary/50'
      }`}
    >
      {children}
    </Link>
  )
}

export default async function ResourcesPage({ searchParams }: Props) {
  const filters = parseHubFilters(await searchParams)

  let benchmarks: BenchmarkAvailability[] = []
  try {
    benchmarks = await benchmarkAvailability()
  } catch (err) {
    console.error('resources: benchmark availability failed:', err)
  }

  const items: Item[] = [
    ...benchmarks
      .filter((b) => b.available)
      .map((b) => ({
        href: `/resources/benchmarks/${b.slug}`,
        type: 'benchmark' as const,
        title: `How AI search answers ${b.name.toLowerCase()} buyers`,
        summary: `Combined results from ${b.businesses} businesses: how often their own sites are cited, by type of question, and what gets cited instead.`,
        date: b.lastMeasured ?? new Date(),
        industries: [b.slug],
      })),
    ...publishedArticles().map((a) => ({
      href: `/resources/${a.slug}`,
      type: a.type,
      title: a.title,
      summary: a.summary,
      date: articleDate(a.updated ?? a.published),
      industries: a.industries,
    })),
  ]
    .filter((item) => !filters.type || item.type === filters.type)
    .filter((item) => !filters.industry || item.industries.length === 0 || item.industries.includes(filters.industry))
    .sort((a, b) => b.date.getTime() - a.date.getTime())

  const pending = benchmarks.filter((b) => !b.available)

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:py-14">
        <h1 className="text-3xl font-bold tracking-tight text-dark sm:text-4xl">Resources</h1>
        <p className="mt-3 max-w-2xl text-lg text-text-secondary">{DESCRIPTION}</p>

        <div className="mt-8 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-medium text-text-secondary">Type</span>
            <Chip href={hubHref({ ...filters, type: undefined })} active={!filters.type}>
              All
            </Chip>
            {(Object.keys(RESOURCE_TYPE_LABELS) as ResourceType[]).map((type) => (
              <Chip key={type} href={hubHref({ ...filters, type })} active={filters.type === type}>
                {RESOURCE_TYPE_LABELS[type]}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-medium text-text-secondary">Industry</span>
            <Chip href={hubHref({ ...filters, industry: undefined })} active={!filters.industry}>
              All
            </Chip>
            {benchmarks.map((b) => (
              <Chip key={b.slug} href={hubHref({ ...filters, industry: b.slug })} active={filters.industry === b.slug}>
                {b.name}
              </Chip>
            ))}
          </div>
        </div>

        {items.length === 0 ? (
          <p className="mt-10 text-sm text-text-secondary">
            Nothing here yet for this filter.{' '}
            <Link href="/resources" className="text-primary hover:underline">
              See everything
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block h-full rounded-lg border border-border bg-white p-5 shadow-sm transition-colors hover:border-primary/50"
                >
                  <p className="text-xs text-text-secondary">
                    {RESOURCE_TYPE_LABELS[item.type]} · {formatDay(item.date)}
                    {item.industries.length === 1 && industryName(item.industries[0])
                      ? ` · ${industryName(item.industries[0])}`
                      : ''}
                  </p>
                  <h2 className="mt-2 font-semibold text-dark">{item.title}</h2>
                  <p className="mt-2 text-sm text-text-secondary">{item.summary}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {pending.length > 0 && (!filters.type || filters.type === 'benchmark') && (
          <p className="mt-10 text-sm text-text-secondary">
            Industry benchmarks publish once 10 businesses in that industry have been measured. In progress:{' '}
            {pending.map((b) => b.name).join(', ')}.
          </p>
        )}

        <SnapshotCta />
      </main>
      <GoogleAnalytics />
    </div>
  )
}
