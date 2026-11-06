import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AuthShell } from '@/components/auth/AuthShell'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Confirm your email | BusinessPulse' }

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

/**
 * Where the emailed confirmation link lands. better-auth has already checked
 * the token: on success it signed the user in, and on failure it adds ?error=.
 */
export default async function EmailVerifiedPage({ searchParams }: Props) {
  const { error } = await searchParams
  if (!error && (await getSession())) redirect('/account?welcome=1')

  return (
    <AuthShell
      title={error ? 'This link has expired' : 'Your email is confirmed'}
      footer={
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      }
    >
      <p className="text-sm text-dark">
        {error
          ? 'Confirmation links work for 24 hours and only once. Sign in with your email and password, and we’ll send you a new one.'
          : 'Sign in with your email and password to open your account.'}
      </p>
    </AuthShell>
  )
}
