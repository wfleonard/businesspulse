import type { Metadata } from 'next'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { unsubscribeByToken } from '@/lib/aeo/recheck'
import { looksLikeToken } from '@/lib/aeo/tokens'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Unsubscribe | BusinessPulse',
  robots: { index: false, follow: false },
}

type Props = { searchParams: Promise<{ token?: string | string[] }> }

function Message({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md text-center">
        <h1 className="text-xl font-bold text-dark">{title}</h1>
        <div className="mt-3 space-y-3 text-sm text-text-secondary">{children}</div>
        <Link href="/" className="mt-6 inline-flex text-sm text-primary hover:underline">
          BusinessPulse
        </Link>
      </Card>
    </main>
  )
}

export default async function UnsubscribePage({ searchParams }: Props) {
  const { token } = await searchParams
  const outcome = looksLikeToken(token) ? await unsubscribeByToken(token) : 'invalid'

  if (outcome === 'invalid') {
    return (
      <Message title="This link isn't valid">
        <p>
          It may have been cut off when it was copied. Open it straight from the email, or reply to that email and
          we&apos;ll take you off the list.
        </p>
      </Message>
    )
  }

  return (
    <Message title={outcome === 'already' ? "You're already unsubscribed" : "You're unsubscribed"}>
      <p>We won&apos;t email you about your AI visibility again.</p>
      <p>Your report links keep working, and you can run a new snapshot whenever you like.</p>
    </Message>
  )
}
