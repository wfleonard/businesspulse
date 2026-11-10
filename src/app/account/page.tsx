import type { Metadata } from 'next'
import Link from 'next/link'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { PublicHeader } from '@/components/site/PublicHeader'
import { Card } from '@/components/ui/Card'
import { AutoRefresh } from '@/components/aeo/AutoRefresh'
import { getBrief } from '@/lib/account/brief'
import { getBusiness, linkSnapshots, listReports, type AccountReport } from '@/lib/account/business'
import { FixCard } from '@/components/account/FixCard'
import { PulseCard } from '@/components/account/PulseCard'
import { currentFixRequest } from '@/lib/aeo/fix-requests'
import { approvedBusinessPanel } from '@/lib/aeo/business-panel-jobs'
import { loadPulseFacts, pulsePriceCents, pulseState, stripeConfigured } from '@/lib/aeo/payments'
import { activePanels } from '@/lib/aeo/requests'
import { stateInfo } from '@/lib/aeo/states'
import { isAdmin, requireSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Your account | BusinessPulse' }

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

function reportSummary(report: AccountReport): string {
  if (report.status === 'queued' || report.status === 'running') return 'Running now'
  if (report.status === 'failed') return 'Didn’t finish'
  return `Cited on ${report.citedCount} of ${report.questionCount} questions`
}

/**
 * A customer's own area: their business and every report it owns
 * (docs/pulse-plan.md). Everything is loaded from the session user's id.
 */
export default async function AccountPage({ searchParams }: Props) {
  const session = await requireSession()
  const params = await searchParams
  const { user } = session

  const owned = await getBusiness(user.id)
  // Picks up snapshots verified since the profile was saved.
  if (owned) await linkSnapshots(owned.id, user.email)
  const [reports, panels, brief, questionSet] = await Promise.all([
    listReports(user.id),
    owned ? activePanels() : [],
    owned ? getBrief(user.id) : null,
    owned ? approvedBusinessPanel(owned.id) : null,
  ])
  const reading = brief?.status === 'queued' || brief?.status === 'reading'
  const pulse = owned ? pulseState(await loadPulseFacts(owned.id)) : null
  const fix = owned ? await currentFixRequest(user.id) : null
  // Just back from Stripe: the webhook may still be on its way, so keep checking.
  const justPaid = params.paid === '1' && pulse?.kind !== 'running'
  const industry = owned
    ? owned.panelSlug
      ? (panels.find((p) => p.slug === owned.panelSlug)?.name ?? owned.panelSlug)
      : owned.customIndustry
    : ''

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader signedIn />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:py-14">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-dark">Your account</h1>
            <p className="mt-1 text-sm text-text-secondary">
              {user.name} · {user.email}
            </p>
          </div>
          <div className="shrink-0 whitespace-nowrap">
            <SignOutButton />
          </div>
        </div>

        {params.welcome === '1' && (
          <p className="mt-6 rounded-md bg-success/10 px-3 py-2 text-sm text-success">
            Your email is confirmed and your account is ready.
          </p>
        )}
        {(reading || justPaid || pulse?.kind === 'running') && <AutoRefresh seconds={15} />}
        {params.paid === '1' && (
          <p className="mt-6 rounded-md bg-success/10 px-3 py-2 text-sm text-success">
            {pulse?.kind === 'running'
              ? 'Payment received. Your report is running, and we’ll email you when it’s ready.'
              : 'Payment received. We’re starting your report.'}
          </p>
        )}
        {params.fixpaid === '1' && (
          <p className="mt-6 rounded-md bg-success/10 px-3 py-2 text-sm text-success">
            Payment received, thank you. We&apos;ll start on your website shortly and keep you posted by email.
          </p>
        )}
        {params.fixwithdrawn === '1' && (
          <p className="mt-6 rounded-md bg-gray-100 px-3 py-2 text-sm text-text-secondary">Your fix request is withdrawn.</p>
        )}
        {params.canceled === '1' && (
          <p className="mt-6 rounded-md bg-gray-100 px-3 py-2 text-sm text-text-secondary">
            Checkout was canceled. You weren&apos;t charged.
          </p>
        )}
        {typeof params.error === 'string' && (
          <p className="mt-6 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{params.error}</p>
        )}
        {params.saved === '1' && (
          <p className="mt-6 rounded-md bg-success/10 px-3 py-2 text-sm text-success">Your business is saved.</p>
        )}
        {params.confirmed === '1' && (
          <p className="mt-6 rounded-md bg-success/10 px-3 py-2 text-sm text-success">
            Thanks. We&apos;ll prepare your report questions from what you confirmed.
          </p>
        )}

        {isAdmin(session) && (
          <p className="mt-6 text-sm">
            You&apos;re an admin.{' '}
            <Link href="/dashboard" className="font-medium text-primary hover:underline">
              Go to the dashboard
            </Link>
          </p>
        )}

        {owned ? (
          <Card className="mt-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-dark">{owned.name}</h2>
                <p className="mt-1 text-sm text-text-secondary">
                  {owned.domain}
                  {owned.otherDomains.length > 0 && ` + ${owned.otherDomains.join(', ')}`}
                </p>
                <p className="mt-1 text-sm text-text-secondary">
                  {industry} · {owned.service} · {owned.city}, {stateInfo(owned.state)?.name ?? owned.state}
                </p>
              </div>
              <Link href="/account/business" className="shrink-0 text-sm font-medium text-primary hover:underline">
                Edit
              </Link>
            </div>
          </Card>
        ) : null}

        {owned && brief && (
          <Card className="mt-6">
            <h2 className="text-lg font-semibold text-dark">What we found on your site</h2>
            {reading && (
              <p className="mt-2 text-sm text-text-secondary">
                We&apos;re reading your website to learn what you sell and where you work. This usually takes a minute
                or two, and this page updates on its own.
              </p>
            )}
            {brief.status === 'ready' && (
              <>
                <p className="mt-2 text-sm text-text-secondary">
                  Please check what we found. Your report questions are built from it.
                </p>
                <Link
                  href="/account/brief"
                  className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                >
                  Review and confirm
                </Link>
              </>
            )}
            {brief.status === 'confirmed' && brief.confirmed && (
              <>
                <p className="mt-2 text-sm text-text-secondary">
                  {questionSet
                    ? `Confirmed. Your report asks ${questionSet.questions.length} questions written for your business.`
                    : 'Confirmed. We’re preparing your report questions from it.'}
                </p>
                <p className="mt-2 text-sm text-dark">{brief.confirmed.offerings.slice(0, 6).join(' · ')}</p>
                <Link href="/account/brief" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
                  Make changes
                </Link>
              </>
            )}
            {brief.status === 'failed' && (
              <p className="mt-2 text-sm text-text-secondary">
                We couldn&apos;t finish reading your website. We&apos;ve been told and will follow up by email.
              </p>
            )}
          </Card>
        )}

        {!owned && (
          <Card className="mt-8">
            <h2 className="text-lg font-semibold text-dark">Set up your business</h2>
            <p className="mt-2 text-sm text-text-secondary">
              Tell us your website, industry, and service area. Your reports are built from it, and any free
              snapshots you ran with {user.email} will show up here.
            </p>
            <Link
              href="/account/business"
              className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              Set up your business
            </Link>
          </Card>
        )}

        {owned && fix && <FixCard request={fix} paymentsReady={stripeConfigured()} />}

        {owned && pulse && <PulseCard state={pulse} priceCents={pulsePriceCents()} paymentsReady={stripeConfigured()} />}

        <Card className="mt-6">
          <h2 className="text-lg font-semibold text-dark">Your reports</h2>
          {reports.length > 0 ? (
            <ul className="mt-4 divide-y divide-border">
              {reports.map((report) => (
                <li key={report.publicId} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <p className="text-sm font-medium text-dark">
                      {report.kind === 'pulse' ? 'Pulse report' : report.kind === 'recheck' ? '30-day re-check' : 'Free snapshot'} ·{' '}
                      {report.domain}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {dateFormat.format(report.createdAt)} · {reportSummary(report)}
                    </p>
                  </div>
                  {report.status === 'done' && (
                    <Link
                      href={report.kind === 'pulse' ? `/account/reports/${report.publicId}` : `/report/${report.publicId}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      View report
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <>
              <p className="mt-2 text-sm text-text-secondary">
                {owned
                  ? `No reports yet. Free snapshots you run with ${user.email} will show up here.`
                  : 'Your reports will show up here once your business is set up.'}
              </p>
              <Link
                href="/"
                className="mt-4 inline-block rounded-md border border-border px-4 py-2 text-sm font-medium text-dark hover:bg-gray-50"
              >
                Get a free snapshot
              </Link>
            </>
          )}
        </Card>
      </main>
    </div>
  )
}
