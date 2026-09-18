'use client'

import { useActionState } from 'react'
import { createProspectSnapshot, type ProspectFormState } from '@/app/dashboard/aeo/actions'

type Props = {
  panels: { slug: string; name: string }[]
  states: { code: string; name: string }[]
}

const inputClass =
  'w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary/30'

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-dark">
        {label}
        {hint && <span className="ml-1 font-normal text-text-secondary">{hint}</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  )
}

/** Dashboard form for an outbound prospect snapshot. On success the action redirects to the run page. */
export function ProspectForm({ panels, states }: Props) {
  const [state, action, pending] = useActionState<ProspectFormState, FormData>(createProspectSnapshot, {})
  const values = state.values ?? {}
  const errors = state.fields ?? {}

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="businessName" label="Business name" error={errors.businessName}>
          <input id="businessName" name="businessName" required defaultValue={values.businessName} className={inputClass} />
        </Field>
        <Field id="website" label="Website" error={errors.website}>
          <input
            id="website"
            name="website"
            inputMode="url"
            placeholder="example.com"
            required
            defaultValue={values.website}
            className={inputClass}
          />
        </Field>
      </div>

      <Field id="service" label="Main service" hint="in the buyer's words" error={errors.service}>
        <input
          id="service"
          name="service"
          placeholder="e.g. commercial roofing"
          required
          defaultValue={values.service}
          className={inputClass}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
        <Field id="city" label="City" error={errors.city}>
          <input id="city" name="city" required defaultValue={values.city} className={inputClass} />
        </Field>
        <Field id="state" label="State" error={errors.state}>
          <select id="state" name="state" required defaultValue={values.state ?? ''} className={inputClass}>
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
        <select id="vertical" name="vertical" required defaultValue={values.vertical ?? ''} className={inputClass}>
          <option value="">Choose the industry</option>
          {panels.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name}
            </option>
          ))}
          <option value="other">Something else (questions generated from their website)</option>
        </select>
      </Field>

      <Field id="email" label="Prospect's email" hint="optional, for your records; nothing is sent" error={errors.email}>
        <input id="email" name="email" type="email" defaultValue={values.email} className={inputClass} />
      </Field>

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
      >
        {pending ? 'Starting…' : 'Run snapshot'}
      </button>
    </form>
  )
}
