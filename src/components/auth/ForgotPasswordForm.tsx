'use client'

import { useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/Button'
import { Field, inputClass } from './AuthShell'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { error } = await authClient.requestPasswordReset({ email, redirectTo: '/reset-password' })
      if (error) {
        setError(error.status === 429 ? 'Too many tries. Please wait a minute and try again.' : 'Something went wrong. Please try again.')
        return
      }
      setSent(true)
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // The same message whether or not the email has a login, so the form can't be used to check.
  if (sent) {
    return (
      <p className="text-sm text-dark">
        If <span className="font-medium">{email}</span> has a BusinessPulse login, a link to reset the password is on its
        way. It works for 24 hours.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={loading || !email} className="w-full">
        {loading ? 'Sending…' : 'Email me a reset link'}
      </Button>
    </form>
  )
}
