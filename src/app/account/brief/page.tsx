import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BriefForm } from '@/components/account/BriefForm'
import { PublicHeader } from '@/components/site/PublicHeader'
import { Card } from '@/components/ui/Card'
import { getBrief } from '@/lib/account/brief'
import { SCOPE_LABEL, SERVICE_SCOPES } from '@/lib/aeo/brief'
import { requireSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Confirm your business | BusinessPulse' }

/** The client checks what we found on their site before any questions are drafted. */
export default async function BriefPage() {
  const { user } = await requireSession()
  const current = await getBrief(user.id)
  if (!current || !current.brief || (current.status !== 'ready' && current.status !== 'confirmed')) redirect('/account')

  const { brief, confirmed } = current
  const known = new Set(brief.offerings.map((o) => o.name))
  const knownBuyers = new Set(brief.buyers.map((b) => b.type))

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader signedIn />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:py-14">
        <Link href="/account" className="text-sm text-primary hover:underline">
          Your account
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-dark">Here&apos;s what we found</h1>
        <p className="mt-2 text-sm text-text-secondary">
          We read {current.pages.length} {current.pages.length === 1 ? 'page' : 'pages'} of your website. Your report
          asks AI assistants the questions your buyers ask, so please fix anything we got wrong.
        </p>
        {!brief.siteRead && (
          <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            We couldn&apos;t read your website, so this is based on your business profile. Please check it carefully.
          </p>
        )}
        <Card className="mt-6">
          <p className="text-sm text-dark">{brief.summary}</p>
        </Card>
        <Card className="mt-6">
          <BriefForm
            offerings={brief.offerings.map((o) => ({
              ...o,
              checked: confirmed ? confirmed.offerings.includes(o.name) : true,
            }))}
            addedOfferings={(confirmed?.offerings ?? []).filter((o) => !known.has(o)).join('\n')}
            notOffered={brief.notOffered}
            buyers={brief.buyers.map((b) => ({
              name: b.type,
              detail: b.detail,
              sources: b.sources,
              checked: confirmed ? confirmed.buyers.includes(b.type) : true,
            }))}
            addedBuyers={(confirmed?.buyers ?? []).filter((b) => !knownBuyers.has(b)).join('\n')}
            scope={confirmed?.scope ?? brief.serviceArea.scope}
            scopes={SERVICE_SCOPES.map((value) => ({ value, label: SCOPE_LABEL[value] }))}
            places={(confirmed?.places ?? brief.serviceArea.places).join('\n')}
            gaps={brief.gaps}
            answers={Object.fromEntries((confirmed?.answers ?? []).map((a) => [a.question, a.answer]))}
            notes={confirmed?.notes ?? ''}
            confirmed={current.status === 'confirmed'}
          />
        </Card>
      </main>
    </div>
  )
}
