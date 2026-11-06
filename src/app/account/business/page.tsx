import type { Metadata } from 'next'
import { BusinessForm } from '@/components/account/BusinessForm'
import { PublicHeader } from '@/components/site/PublicHeader'
import { Card } from '@/components/ui/Card'
import { getBusiness } from '@/lib/account/business'
import { CUSTOM_INDUSTRY } from '@/lib/account/schema'
import { activePanels } from '@/lib/aeo/requests'
import { stateOptions } from '@/lib/aeo/states'
import { requireSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Your business | BusinessPulse' }

/** Set up or edit the signed-in customer's one business. */
export default async function BusinessPage() {
  const { user } = await requireSession()
  const [owned, panels] = await Promise.all([getBusiness(user.id), activePanels()])

  const initial = owned
    ? {
        name: owned.name,
        website: owned.domain,
        otherDomains: owned.otherDomains.join('\n'),
        // A panel that has since been switched off shows as unchosen, so they pick again.
        industry: owned.panelSlug
          ? panels.some((p) => p.slug === owned.panelSlug)
            ? owned.panelSlug
            : ''
          : CUSTOM_INDUSTRY,
        customIndustry: owned.customIndustry,
        service: owned.service,
        city: owned.city,
        state: owned.state,
      }
    : { name: '', website: '', otherDomains: '', industry: '', customIndustry: '', service: '', city: '', state: '' }

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:py-14">
        <h1 className="text-3xl font-bold tracking-tight text-dark">
          {owned ? 'Your business' : 'Set up your business'}
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Your reports ask AI assistants the questions buyers in your industry ask, about your service and your area.
          One business per account.
        </p>
        <Card className="mt-8">
          <BusinessForm initial={initial} panels={panels} states={stateOptions()} isNew={!owned} />
        </Card>
      </main>
    </div>
  )
}
