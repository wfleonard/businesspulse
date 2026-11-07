'use client'

import { useActionState } from 'react'
import { confirmBriefAction, type BriefFormState } from '@/app/account/actions'
import { inputClass } from '@/components/auth/AuthShell'
import { Button } from '@/components/ui/Button'

type Item = { name: string; detail: string; sources: string[]; checked: boolean; main?: boolean }

type Props = {
  offerings: Item[]
  addedOfferings: string
  notOffered: { name: string; reason: string }[]
  buyers: Item[]
  addedBuyers: string
  scope: string
  scopes: { value: string; label: string }[]
  places: string
  gaps: string[]
  notes: string
  confirmed: boolean
}

function Sources({ urls }: { urls: string[] }) {
  if (urls.length === 0) return null
  const shown = urls.slice(0, 2)
  return (
    <span className="ml-1 text-xs text-text-secondary">
      (from{' '}
      {shown.map((url, i) => (
        <span key={url}>
          {i > 0 && ', '}
          <a href={url} target="_blank" rel="noopener noreferrer" className="underline">
            {new URL(url).pathname === '/' ? 'home page' : new URL(url).pathname}
          </a>
        </span>
      ))}
      {urls.length > shown.length && ` and ${urls.length - shown.length} more`})
    </span>
  )
}

function Checklist({ name, items }: { name: string; items: Item[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.name}>
          <label className="flex items-start gap-2 text-sm text-dark">
            <input type="checkbox" name={name} value={item.name} defaultChecked={item.checked} className="mt-1" />
            <span>
              <span className="font-medium">{item.name}</span>
              {item.main && <span className="ml-1 rounded bg-primary/10 px-1.5 text-xs text-primary">main</span>}
              {item.detail && <span className="text-text-secondary">: {item.detail}</span>}
              <Sources urls={item.sources} />
            </span>
          </label>
        </li>
      ))}
    </ul>
  )
}

export function BriefForm(props: Props) {
  const [state, formAction, pending] = useActionState<BriefFormState, FormData>(confirmBriefAction, null)
  const errors = state?.errors ?? {}

  return (
    <form action={formAction} className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold text-dark">What you sell</h2>
        <p className="mt-1 text-sm text-text-secondary">Untick anything you don&apos;t actually sell.</p>
        <div className="mt-3">
          <Checklist name="offerings" items={props.offerings} />
        </div>
        <label htmlFor="addedOfferings" className="mt-4 block text-sm font-medium text-dark">
          Anything we missed? (one per line)
        </label>
        <textarea id="addedOfferings" name="addedOfferings" rows={2} defaultValue={props.addedOfferings} className={`mt-1 ${inputClass}`} />
        {(errors.offerings || errors.addedOfferings) && (
          <p className="mt-1 text-xs text-danger">{errors.offerings ?? errors.addedOfferings}</p>
        )}
      </section>

      {props.notOffered.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-dark">What you don&apos;t offer</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Your report won&apos;t ask about these. If you do offer one, add it above.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-dark">
            {props.notOffered.map((n) => (
              <li key={n.name}>
                {n.name}
                {n.reason && <span className="text-text-secondary">: {n.reason}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold text-dark">Who buys from you</h2>
        <div className="mt-3">
          <Checklist name="buyers" items={props.buyers} />
        </div>
        <label htmlFor="addedBuyers" className="mt-4 block text-sm font-medium text-dark">
          Other kinds of customers? (one per line)
        </label>
        <textarea id="addedBuyers" name="addedBuyers" rows={2} defaultValue={props.addedBuyers} className={`mt-1 ${inputClass}`} />
      </section>

      <section>
        <h2 className="text-lg font-semibold text-dark">Where you serve</h2>
        <label htmlFor="scope" className="mt-3 block text-sm font-medium text-dark">
          How far do you serve customers?
        </label>
        <select id="scope" name="scope" defaultValue={props.scope} className={`mt-1 ${inputClass}`}>
          {props.scopes.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        {errors.scope && <p className="mt-1 text-xs text-danger">{errors.scope}</p>}
        <label htmlFor="places" className="mt-4 block text-sm font-medium text-dark">
          Towns, counties, or states you serve (one per line)
        </label>
        <textarea id="places" name="places" rows={3} defaultValue={props.places} className={`mt-1 ${inputClass}`} />
        {errors.places && <p className="mt-1 text-xs text-danger">{errors.places}</p>}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-dark">Anything else?</h2>
        {props.gaps.length > 0 && (
          <>
            <p className="mt-1 text-sm text-text-secondary">Your site didn&apos;t make these clear. A line or two helps:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-dark">
              {props.gaps.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          </>
        )}
        <textarea
          id="notes"
          name="notes"
          rows={4}
          aria-label="Notes"
          defaultValue={props.notes}
          className={`mt-3 ${inputClass}`}
          placeholder="Anything we should know about your business"
        />
        {errors.notes && <p className="mt-1 text-xs text-danger">{errors.notes}</p>}
      </section>

      {errors.form && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{errors.form}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : props.confirmed ? 'Save changes' : 'This looks right'}
      </Button>
    </form>
  )
}
