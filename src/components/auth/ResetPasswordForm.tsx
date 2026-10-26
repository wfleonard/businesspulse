'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/Button'
import { Field, inputClass } from './AuthShell'

/** Matches minPasswordLength in src/lib/auth.ts. */
const MIN_LENGTH = 12

export function ResetPasswordForm() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get('token')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // better-auth sends expired or used links here with ?error=INVALID_TOKEN and no token.
  if (!token || params.get('error')) {
    return (
      <div className="space-y-4 text-sm text-dark">
        <p>This link has expired or was already used.</p>
        <Link href="/forgot-password" className="font-medium text-primary hover:underline">
          Get a new link
        </Link>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < MIN_LENGTH) return setError(`Use at least ${MIN_LENGTH} characters.`)
    if (password !== confirm) return setError("The passwords don't match.")
    setLoading(true)
    try {
      const { error } = await authClient.resetPassword({ newPassword: password, token: token! })
      if (error) {
        setError(
          error.code === 'INVALID_TOKEN'
            ? 'This link has expired or was already used. Get a new one from "Forgot password".'
            : error.message || 'Something went wrong. Please try again.'
        )
        return
      }
      router.push('/login?reset=done')
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field id="password" label="New password">
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_LENGTH}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field id="confirm" label="Confirm password">
        <input
          id="confirm"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={inputClass}
        />
      </Field>
      <p className="text-xs text-text-secondary">At least {MIN_LENGTH} characters. A short phrase is easiest.</p>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={loading || !password || !confirm} className="w-full">
        {loading ? 'Saving…' : 'Set password'}
      </Button>
    </form>
  )
}
