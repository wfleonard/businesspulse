import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { AuthShell } from '@/components/auth/AuthShell'
import { LoginForm } from '@/components/auth/LoginForm'

export const metadata: Metadata = { title: 'Sign in | BusinessPulse' }

export default function LoginPage() {
  return (
    <AuthShell
      title="Sign in"
      subtitle="BusinessPulse leads, reports, and panels."
      footer={
        <Link href="/forgot-password" className="text-primary hover:underline">
          Forgot your password?
        </Link>
      }
    >
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  )
}
