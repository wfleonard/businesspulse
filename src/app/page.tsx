import Image from 'next/image'
import Link from 'next/link'
import { GoogleAnalytics } from '@/components/GoogleAnalytics'
import { SnapshotForm } from '@/components/aeo/SnapshotForm'
import { workerConfig } from '@/lib/aeo/config'
import { activePanels } from '@/lib/aeo/requests'
import { stateOptions } from '@/lib/aeo/states'

// Reads the panel list and the Turnstile site key at request time, so neither
// is baked into the build.
export const dynamic = 'force-dynamic'

export default async function Home() {
  const panels = await activePanels()
  const questions = workerConfig().snapshotQuestions

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-12 sm:py-20">
      <div className="grid gap-10 lg:grid-cols-[1fr_26rem] lg:items-start">
        <section>
          <Image
            src="/business-pulse-logo.webp"
            alt="BusinessPulse: AI website optimization"
            width={1135}
            height={853}
            priority
            className="h-auto w-56 sm:w-72"
          />
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-dark sm:text-5xl">
            When buyers ask AI who to hire, does it name you?
          </h1>
          <p className="mt-5 text-lg text-text-secondary">
            Get a free snapshot of how AI search sees your business: which buyer questions cite your
            website, and who gets cited when it doesn&apos;t.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-dark">
            <li>
              <span className="font-semibold">{questions} real buyer questions</span> for your service and
              area, asked to Perplexity.
            </li>
            <li>
              <span className="font-semibold">Where you show up,</span> and the competitors and directories
              cited instead.
            </li>
            <li>
              <span className="font-semibold">Free, no account.</span> Your report link arrives by email in
              a few minutes.
            </li>
          </ul>
        </section>
        <SnapshotForm
          panels={panels}
          states={stateOptions()}
          turnstileSiteKey={process.env.TURNSTILE_SITE_KEY ?? ''}
        />
      </div>
      <footer className="mt-auto flex gap-4 pt-16 text-xs text-text-secondary">
        <Link href="/resources" className="hover:text-dark">
          Resources
        </Link>
        <Link href="/privacy" className="hover:text-dark">
          Privacy
        </Link>
        <Link href="/login" className="hover:text-dark">
          Sign in
        </Link>
      </footer>
      <GoogleAnalytics />
    </main>
  )
}
