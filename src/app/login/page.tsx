import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { AuthShell } from '@/components/auth/AuthShell'
import { LoginForm } from '@/components/auth/LoginForm'
import { signupOpen } from '@/lib/access/signup'

// Reads BP_ALLOW_SIGNUP at request time.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Sign in | BusinessPulse' }

export default function LoginPage() {
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
