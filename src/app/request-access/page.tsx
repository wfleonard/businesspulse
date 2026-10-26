import type { Metadata } from 'next'
import Link from 'next/link'
import { AuthShell } from '@/components/auth/AuthShell'
import { RequestAccessForm } from '@/components/auth/RequestAccessForm'

export const metadata: Metadata = { title: 'Request access | BusinessPulse' }

export default function RequestAccessPage() {
  return (
    <AuthShell
      title="Request access"
      subtitle={
        <>
          A login opens every BusinessPulse lead and report, so each one is approved by hand. Looking for your own
          report?{' '}
          <Link href="/" className="text-primary hover:underline">
            Get a free snapshot
          </Link>{' '}
          instead; no account needed.
        </>
      }
      footer={
        <p>
          Already have a login?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <RequestAccessForm />
    </AuthShell>
  )
}
