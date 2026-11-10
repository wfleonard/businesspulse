import type { Metadata } from 'next'
import Link from 'next/link'
import { AuthShell } from '@/components/auth/AuthShell'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { SignUpForm } from '@/components/auth/SignUpForm'
import { signupOpen } from '@/lib/access/signup'
import { getSession } from '@/lib/session'

// Reads BP_ALLOW_SIGNUP, the Turnstile site key, and the session at request time.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Create your account | BusinessPulse' }

export default async function SignUpPage() {
  const open = signupOpen()
  // Signed in already: one account covers one business, so don't start a second by accident.
  const session = await getSession()
  if (session) {
    return (
      <AuthShell title="You're already signed in" subtitle={'Signed in as ' + session.user.email + '.'}>
        <div className="space-y-4 text-sm text-dark">
          <p>
            Each account covers one business. To set up a different business, sign out first and create a new account
            with that business&apos;s email address.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/account" className="rounded-md bg-primary px-4 py-2 font-medium text-white hover:bg-primary/90">
              Go to your account
            </Link>
            <SignOutButton />
          </div>
        </div>
      </AuthShell>
    )
  }
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
