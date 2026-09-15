import type { Metadata } from 'next'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { workerConfig } from '@/lib/aeo/config'
import { appUrl, reportReadyEmail } from '@/lib/aeo/emails'
import { verifyRequest } from '@/lib/aeo/requests'
import { looksLikeToken } from '@/lib/aeo/tokens'
import { sendEmail } from '@/lib/email/provider'
import { clientIp, rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Confirm your snapshot | BusinessPulse',
  robots: { index: false, follow: false },
}

const VERIFY_PER_IP_PER_HOUR = 20

type Props = { searchParams: Promise<{ token?: string | string[] }> }

function Message({
  title,
  children,
  action,
}: {
  title: string
  children: React.ReactNode
  action?: { href: string; label: string }
}) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md text-center">
        <h1 className="text-xl font-bold text-dark">{title}</h1>
        <div className="mt-3 space-y-3 text-sm text-text-secondary">{children}</div>
        {action && (
          <Link
            href={action.href}
            className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            {action.label}
          </Link>
        )}
      </Card>
    </main>
  )
}

const REQUEST_AGAIN = { href: '/', label: 'Request a new snapshot' }

export default async function VerifyPage({ searchParams }: Props) {
  const { token } = await searchParams

  const ip = clientIp(await headers())
  const limit = await rateLimit(`aeo:verify:ip:${ip}`, VERIFY_PER_IP_PER_HOUR, 60 * 60, { failClosed: true })
  if (limit.unavailable) {
    return (
      <Message title="We're having trouble right now">
        <p>Please open the link from your email again in a few minutes. It stays valid for 24 hours.</p>
      </Message>
    )
  }
  if (!limit.success) {
    return (
      <Message title="Too many attempts">
        <p>Please wait a little while, then open the link from your email again.</p>
      </Message>
    )
  }

  if (!looksLikeToken(token)) {
    return (
      <Message title="This link isn't valid" action={REQUEST_AGAIN}>
        <p>It may have been cut off when it was copied. Open it straight from the email, or request a new snapshot.</p>
      </Message>
    )
  }

  const outcome = await verifyRequest(token)

  if (outcome.status === 'invalid') {
    return (
      <Message title="This link isn't valid" action={REQUEST_AGAIN}>
        <p>We couldn&apos;t find this request. Please request a new snapshot.</p>
      </Message>
    )
  }

  if (outcome.status === 'expired') {
    return (
      <Message title="This link has expired" action={REQUEST_AGAIN}>
        <p>Confirmation links last 24 hours. Request a new snapshot and we&apos;ll send a fresh one.</p>
      </Message>
    )
  }

  const reportPath = `/report/${outcome.run.publicId}`

  if (outcome.run.status === 'done') {
    if (outcome.firstVisit) {
      const sent = await sendEmail({
        to: outcome.email,
        ...reportReadyEmail({
          businessName: outcome.businessName,
          domain: outcome.domain,
          reportUrl: appUrl(reportPath),
        }),
      })
      if (!sent.sent) console.warn('aeo verify: report link email not sent:', sent.error ?? sent.skipped)
    }
    return (
      <Message title="Your report is ready" action={{ href: reportPath, label: 'View my report' }}>
        <p>
          We checked {outcome.domain} recently, so your snapshot is already done.
          {outcome.firstVisit && ' We also emailed you the link.'}
        </p>
      </Message>
    )
  }

  if (outcome.run.status === 'failed') {
    return (
      <Message title="We couldn't finish this report">
        <p>Something went wrong on our side while checking {outcome.domain}. We&apos;ve logged it and will look into it.</p>
      </Message>
    )
  }

  return (
    <Message title="Email confirmed">
      <p>
        We&apos;re asking AI search {workerConfig().snapshotQuestions} questions that buyers ask about
        businesses like {outcome.businessName}.
      </p>
      <p>That usually takes a few minutes. We&apos;ll email you the report link as soon as it&apos;s ready.</p>
    </Message>
  )
}
