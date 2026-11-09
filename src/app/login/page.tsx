import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { AuthShell } from '@/components/auth/AuthShell'
import { LoginForm } from '@/components/auth/LoginForm'
import { redirect } from 'next/navigation'
import { safeNext } from '@/lib/access/safe-next'
import { signupOpen } from '@/lib/access/signup'
import { getSession } from '@/lib/session'

// Reads BP_ALLOW_SIGNUP at request time.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Sign in | BusinessPulse' }

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function LoginPage({ searchParams }: Props) {
  // The header's "Sign in" link is static, so a signed-in visitor goes straight on.
  const session = await getSession()
  if (session) {
    const next = (await searchParams).next
    redirect(typeof next === 'string' ? safeNext(next) : '/account')
  }
  return (
    <AuthShell
      title="Sign in"
      subtitle="Sign in to your BusinessPulse account."
      footer={
        <>
          <p>
            <Link href="/forgot-password" className="text-primary hover:underline">
              Forgot your password?
            </Link>
          </p>
          {signupOpen() && (
            <p>
              New to BusinessPulse?{' '}
              <Link href="/signup" className="text-primary hover:underline">
                Create a free account
              </Link>
            </p>
          )}
        </>
      }
    >
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  )
}
