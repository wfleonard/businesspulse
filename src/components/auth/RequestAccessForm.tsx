'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, inputClass } from './AuthShell'

export function RequestAccessForm() {
  const [values, setValues] = useState({ name: '', email: '', note: '' })
  const [fields, setFields] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setFields({})
    setLoading(true)
    try {
      const res = await fetch('/api/access-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body.error || 'Something went wrong. Please try again.')
        setFields(body.fields || {})
        return
      }
      setSent(true)
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <p className="text-sm text-dark">
        Thanks, your request is in. If it&apos;s approved, you&apos;ll get an email at{' '}
        <span className="font-medium">{values.email}</span> with a link to set your password.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field id="name" label="Your name" error={fields.name}>
        <input id="name" autoComplete="name" required value={values.name} onChange={set('name')} className={inputClass} />
      </Field>
      <Field id="email" label="Work email" error={fields.email}>
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
      <Field id="note" label="Why do you need access?" error={fields.note}>
        <textarea id="note" rows={3} maxLength={1000} value={values.note} onChange={set('note')} className={inputClass} />
      </Field>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={loading || !values.name || !values.email} className="w-full">
        {loading ? 'Sending…' : 'Request access'}
      </Button>
    </form>
  )
}
