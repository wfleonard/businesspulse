'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { safeNext } from '@/lib/access/safe-next'
import { EMAIL_VERIFIED_PATH } from '@/lib/access/signup'
import { signIn } from '@/lib/auth-client'
import { Button } from '@/components/ui/Button'
import { Field, inputClass } from './AuthShell'

export function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const next = safeNext(params.get('next'))
  const passwordSet = params.get('reset') === 'done'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [unconfirmed, setUnconfirmed] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setUnconfirmed(false)
    setLoading(true)
    try {
      // callbackURL is where a fresh confirmation link returns to, if one is sent.
      const { error } = await signIn.email({ email, password, callbackURL: EMAIL_VERIFIED_PATH })
      if (error) {
        // better-auth has just emailed a fresh confirmation link.
        if (error.code === 'EMAIL_NOT_VERIFIED') setUnconfirmed(true)
        else setError(error.message || 'Invalid email or password')
        return
      }
      router.push(next)
      router.refresh()
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {passwordSet && (
        <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">
          Your password is set. Sign in with it below.
        </p>
      )}
      <Field id="email" label="Email">
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field id="password" label="Password">
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
      </Field>
      {unconfirmed && (
        <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-dark">
          Confirm your email first. We just sent a new link to <span className="font-medium">{email}</span>.
        </p>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={loading || !email || !password} className="w-full">
        {loading ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  )
}
