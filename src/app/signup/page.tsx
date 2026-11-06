import type { Metadata } from 'next'
import Link from 'next/link'
import { AuthShell } from '@/components/auth/AuthShell'
import { SignUpForm } from '@/components/auth/SignUpForm'
import { signupOpen } from '@/lib/access/signup'

// Reads BP_ALLOW_SIGNUP and the Turnstile site key at request time.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Create your account | BusinessPulse' }

export default function SignUpPage() {
  const open = signupOpen()
  return (
    <AuthShell
      title="Create your free account"
      subtitle="Keep your BusinessPulse reports in one place and see how AI search answers change over time."
      footer={
        <p>
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      {open ? (
        <SignUpForm turnstileSiteKey={process.env.TURNSTILE_SITE_KEY ?? ''} />
      ) : (
        <div className="space-y-4 text-sm text-dark">
          <p>Accounts aren&apos;t open yet.</p>
          <Link href="/" className="font-medium text-primary hover:underline">
            Get a free snapshot instead; no account needed
          </Link>
        </div>
      )}
    </AuthShell>
  )
}
