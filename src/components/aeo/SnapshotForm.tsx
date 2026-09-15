'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Script from 'next/script'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

type Turnstile = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string
  reset: (widgetId?: string) => void
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: Turnstile
  }
}

type Props = {
  panels: { slug: string; name: string }[]
  states: { code: string; name: string }[]
  turnstileSiteKey: string
}

const EMPTY = {
  businessName: '',
  website: '',
  service: '',
  city: '',
  state: '',
  vertical: '',
  email: '',
  contactConsent: false,
}

const inputClass =
  'w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary/30'

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-dark">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

export function SnapshotForm({ panels, states, turnstileSiteKey }: Props) {
  const [fields, setFields] = useState(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [token, setToken] = useState('')
  const [scriptReady, setScriptReady] = useState(false)
  const widgetElement = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)

  useEffect(() => {
    const turnstile = window.turnstile
    if (!turnstileSiteKey || !scriptReady || sentTo || !turnstile || !widgetElement.current) return
    widgetId.current = turnstile.render(widgetElement.current, {
      sitekey: turnstileSiteKey,
      callback: (value: string) => setToken(value),
      'expired-callback': () => setToken(''),
      'error-callback': () => setToken(''),
    })
    return () => {
      if (widgetId.current) turnstile.remove(widgetId.current)
      widgetId.current = null
      setToken('')
    }
  }, [turnstileSiteKey, scriptReady, sentTo])

  function update<K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) {
    setFields((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setErrors({})
    setFormError(null)
    try {
      const res = await fetch('/api/aeo/requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...fields, turnstileToken: token }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        fields?: Record<string, string>
      }
      if (res.ok) {
        setSentTo(fields.email.trim())
        return
      }
      setErrors(data.fields ?? {})
      setFormError(data.error ?? 'Something went wrong. Please try again.')
    } catch {
      setFormError('Connection error. Please try again.')
    } finally {
      setSubmitting(false)
    }
    // Turnstile tokens are single use.
    if (widgetId.current) window.turnstile?.reset(widgetId.current)
    setToken('')
  }

  if (sentTo) {
    return (
      <Card className="w-full">
        <h2 className="text-xl font-bold text-dark">Check your email</h2>
        <p className="mt-3 text-sm text-text-secondary">
          We sent a confirmation link to <span className="font-medium text-dark">{sentTo}</span>. Open it
          within 24 hours and we&apos;ll start your snapshot.
        </p>
        <p className="mt-3 text-sm text-text-secondary">Don&apos;t see it? Check your spam folder.</p>
        <Button
          variant="secondary"
          className="mt-6"
          onClick={() => {
            setSentTo(null)
            setFields(EMPTY)
          }}
        >
          Start over
        </Button>
      </Card>
    )
  }

  const errorProps = (id: string) =>
    errors[id] ? { 'aria-invalid': true, 'aria-describedby': `${id}-error` } : {}

  return (
    <Card className="w-full">
      {turnstileSiteKey && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="afterInteractive"
          onReady={() => setScriptReady(true)}
        />
      )}
      <h2 className="text-lg font-bold text-dark">Get your free snapshot</h2>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
        <Field id="businessName" label="Business name" error={errors.businessName}>
          <input
            id="businessName"
            autoComplete="organization"
            required
            value={fields.businessName}
            onChange={(e) => update('businessName', e.target.value)}
            className={inputClass}
            {...errorProps('businessName')}
          />
        </Field>
        <Field id="website" label="Website" error={errors.website}>
          <input
            id="website"
            inputMode="url"
            autoComplete="url"
            placeholder="example.com"
            required
            value={fields.website}
            onChange={(e) => update('website', e.target.value)}
            className={inputClass}
            {...errorProps('website')}
          />
        </Field>
        <Field id="service" label="Main service" error={errors.service}>
          <input
            id="service"
            placeholder="e.g. directional drilling"
            required
            value={fields.service}
            onChange={(e) => update('service', e.target.value)}
            className={inputClass}
            {...errorProps('service')}
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_9rem]">
          <Field id="city" label="City" error={errors.city}>
            <input
              id="city"
              autoComplete="address-level2"
              required
              value={fields.city}
              onChange={(e) => update('city', e.target.value)}
              className={inputClass}
              {...errorProps('city')}
            />
          </Field>
          <Field id="state" label="State" error={errors.state}>
            <select
              id="state"
              required
              value={fields.state}
              onChange={(e) => update('state', e.target.value)}
              className={inputClass}
              {...errorProps('state')}
            >
              <option value="">Choose</option>
              {states.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field id="vertical" label="Industry" error={errors.vertical}>
          <select
            id="vertical"
            required
            value={fields.vertical}
            onChange={(e) => update('vertical', e.target.value)}
            className={inputClass}
            {...errorProps('vertical')}
          >
            <option value="">Choose your industry</option>
            {panels.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
            <option value="other">Something else</option>
          </select>
        </Field>
        <Field id="email" label="Email for your report" error={errors.email}>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={fields.email}
            onChange={(e) => update('email', e.target.value)}
            className={inputClass}
            {...errorProps('email')}
          />
        </Field>
        <label className="flex items-start gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={fields.contactConsent}
            onChange={(e) => update('contactConsent', e.target.checked)}
            className="mt-0.5"
          />
          <span>You can contact me about improving these results.</span>
        </label>
        {turnstileSiteKey && <div ref={widgetElement} />}
        {formError && (
          <p role="alert" className="text-sm text-danger">
            {formError}
          </p>
        )}
        <Button
          type="submit"
          className="w-full"
          disabled={submitting || (Boolean(turnstileSiteKey) && !token)}
        >
          {submitting ? 'Sending…' : 'Email me my snapshot'}
        </Button>
        <p className="text-xs text-text-secondary">
          Free. No account needed. See our{' '}
          <Link href="/privacy" className="underline">
            privacy policy
          </Link>
          .
        </p>
      </form>
    </Card>
  )
}
