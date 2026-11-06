'use client'

import { useState } from 'react'
import Link from 'next/link'
import { COMPANY_EMAIL_MESSAGE, isFreeEmail } from '@/lib/access/free-email'
import { EMAIL_VERIFIED_PATH } from '@/lib/access/signup'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/Button'
import { Field, inputClass } from './AuthShell'
import { TurnstileWidget } from './TurnstileWidget'

/** Matches minPasswordLength in src/lib/auth.ts. */
const MIN_LENGTH = 12

export function SignUpForm({ turnstileSiteKey }: { turnstileSiteKey: string }) {
  const [values, setValues] = useState({ name: '', email: '', password: '' })
  const [token, setToken] = useState('')
  const [resetKey, setResetKey] = useState(0)
  const [error, setError] = useState<React.ReactNode>(null)
  const [loading, setLoading] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (isFreeEmail(values.email)) return setError(COMPANY_EMAIL_MESSAGE)
    if (values.password.length < MIN_LENGTH) return setError(`Use at least ${MIN_LENGTH} characters for your password.`)
    setLoading(true)
    try {
      const { error } = await authClient.signUp.email(
        {
          name: values.name.trim(),
          email: values.email.trim(),
          password: values.password,
          callbackURL: EMAIL_VERIFIED_PATH,
        },
        { headers: turnstileSiteKey ? { 'x-captcha-response': token } : {} }
      )
      if (error) {
        setResetKey((k) => k + 1)
        if (error.code === 'USER_ALREADY_EXISTS' || error.code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL') {
          setError(
            <>
              That email already has an account.{' '}
              <Link href="/login" className="font-medium underline">
                Sign in
              </Link>{' '}
              or{' '}
              <Link href="/forgot-password" className="font-medium underline">
                reset your password
              </Link>
              .
            </>
          )
        } else if (error.status === 429) {
          setError('Too many tries. Please wait a minute and try again.')
        } else {
          setError(error.message || 'Something went wrong. Please try again.')
        }
        return
      }
      setSentTo(values.email.trim())
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (sentTo) {
    return (
      <div className="space-y-3 text-sm text-dark">
        <p>
          Check your email. We sent a link to <span className="font-medium">{sentTo}</span> to confirm your account. It
          works for 24 hours.
        </p>
        <p className="text-text-secondary">
          Nothing there? Check spam, or sign in with your email and password and we&apos;ll send a new link.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field id="name" label="Your name">
        <input id="name" autoComplete="name" required value={values.name} onChange={set('name')} className={inputClass} />
      </Field>
      <Field id="email" label="Company email">
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={values.email}
          onChange={set('email')}
          className={inputClass}
        />
      </Field>
      <Field id="password" label="Password">
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_LENGTH}
          value={values.password}
          onChange={set('password')}
          className={inputClass}
        />
      </Field>
      <p className="text-xs text-text-secondary">At least {MIN_LENGTH} characters. A short phrase is easiest.</p>
      <TurnstileWidget siteKey={turnstileSiteKey} onToken={setToken} resetKey={resetKey} />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button
        type="submit"
        disabled={loading || !values.name || !values.email || !values.password || (Boolean(turnstileSiteKey) && !token)}
        className="w-full"
      >
        {loading ? 'Creating your account…' : 'Create free account'}
      </Button>
      <p className="text-xs text-text-secondary">
        By creating an account you agree to how we handle your data in our{' '}
        <Link href="/privacy" className="underline">
          privacy policy
        </Link>
        .
      </p>
    </form>
  )
}
