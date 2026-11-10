'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { saveBusinessProfile, type BusinessFormValues } from '@/app/account/actions'
import { IndustryPicker } from '@/components/aeo/IndustryPicker'
import { Field, inputClass } from '@/components/auth/AuthShell'
import { Button } from '@/components/ui/Button'
import { CUSTOM_INDUSTRY } from '@/lib/account/schema'

type Props = {
  initial: BusinessFormValues
  panels: { slug: string; name: string }[]
  states: { code: string; name: string }[]
  isNew: boolean
}

export function BusinessForm({ initial, panels, states, isNew }: Props) {
  const [state, formAction, pending] = useActionState(saveBusinessProfile, null)
  const values = state?.values ?? initial
  const errors = state?.errors ?? {}
  const [industry, setIndustry] = useState(values.industry ?? '')

  // Keyed on the returned state so a failed save re-renders with what was typed.
  return (
    <form key={JSON.stringify(state?.values ?? null)} action={formAction} className="space-y-4" noValidate>
      <Field id="name" label="Business name" error={errors.name}>
        <input id="name" name="name" required defaultValue={values.name} className={inputClass} />
      </Field>
      <Field id="website" label="Main website" error={errors.website}>
        <input
          id="website"
          name="website"
          required
          placeholder="example.com"
          defaultValue={values.website}
          className={inputClass}
        />
      </Field>
      <Field id="otherDomains" label="Other websites you run (optional)" error={errors.otherDomains}>
        <textarea
          id="otherDomains"
          name="otherDomains"
          rows={2}
          placeholder="One per line, or separated by commas"
          defaultValue={values.otherDomains}
          className={inputClass}
        />
      </Field>
      <p className="-mt-2 text-xs text-text-secondary">
        When AI search cites one of these, it counts as your business, not a competitor.
      </p>
      <Field id="industry" label="Industry" error={errors.industry}>
        <IndustryPicker
          id="industry"
          name="industry"
          options={panels}
          value={industry}
          onChange={setIndustry}
          invalid={Boolean(errors.industry)}
          otherLabel="Not listed: tell us what you do"
        />
      </Field>
      {industry === CUSTOM_INDUSTRY && (
        <>
          <Field id="customIndustry" label="What does your business do?" error={errors.customIndustry}>
            <input
              id="customIndustry"
              name="customIndustry"
              placeholder="For example: commercial kitchen equipment repair"
              defaultValue={values.customIndustry}
              className={inputClass}
            />
          </Field>
          <p className="-mt-2 text-xs text-text-secondary">
            We&apos;ll write a set of buyer questions for your industry before your first full report.
          </p>
        </>
      )}
      <Field id="service" label="Main service" error={errors.service}>
        <input
          id="service"
          name="service"
          required
          placeholder="For example: roof replacement"
          defaultValue={values.service}
          className={inputClass}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
        <Field id="city" label="Town or city" error={errors.city}>
          <input id="city" name="city" required defaultValue={values.city} className={inputClass} />
        </Field>
        <Field id="state" label="State" error={errors.state}>
          <select id="state" name="state" required defaultValue={values.state} className={inputClass}>
            <option value="" disabled>
              Choose
            </option>
            {states.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="flex items-center gap-4 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : isNew ? 'Save my business' : 'Save changes'}
        </Button>
        {!isNew && (
          <Link href="/account" className="text-sm text-text-secondary hover:underline">
            Cancel
          </Link>
        )}
      </div>
    </form>
  )
}
