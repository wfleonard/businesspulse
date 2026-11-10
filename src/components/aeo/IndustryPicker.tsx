'use client'

import { useId, useMemo, useRef, useState } from 'react'
import { searchIndustries, type IndustryOption } from '@/lib/aeo/industry-search'
import { cn } from '@/lib/utils'

const OTHER = 'other'

/**
 * Type-to-search industry picker for the snapshot form and the business
 * profile. Finds panels by everyday words ("roofer", "lawyer"), groups them
 * when browsing, and always offers "not listed" at the end, so a business no
 * panel fits isn't pushed into a near miss.
 */
export function IndustryPicker({
  id,
  options,
  value,
  onChange,
  name,
  invalid,
  describedBy,
  otherLabel = 'Not listed: we’ll write questions from your website',
  className,
}: {
  id: string
  options: IndustryOption[]
  /** A panel slug, "other", or "" for nothing chosen yet. */
  value: string
  onChange: (value: string) => void
  /** Also submit the value with a plain form post. */
  name?: string
  invalid?: boolean
  describedBy?: string
  otherLabel?: string
  className?: string
}) {
  const listId = useId()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)

  const selectedLabel = value === OTHER ? otherLabel : (options.find((o) => o.slug === value)?.name ?? '')
  const groups = useMemo(() => searchIndustries(options, query), [options, query])
  // Flat order for the keyboard: every shown industry, then "not listed".
  const flat = useMemo(() => [...groups.flatMap((g) => g.options.map((o) => o.slug)), OTHER], [groups])

  function choose(slug: string) {
    onChange(slug)
    setQuery('')
    setOpen(false)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) setOpen(true)
      setActive((i) => Math.min(i + 1, flat.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      if (open) {
        e.preventDefault()
        choose(flat[active] ?? OTHER)
      }
    } else if (e.key === 'Escape') {
      setQuery('')
      setOpen(false)
    }
  }

  const optionId = (slug: string) => `${listId}-${slug}`
  let index = -1

  return (
    <div className={cn('relative', className)}>
      {name && <input type="hidden" name={name} value={value} />}
      <input
        ref={input}
        id={id}
        type="text"
        role="combobox"
        autoComplete="off"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && flat[active] ? optionId(flat[active]) : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        placeholder="Type your trade, e.g. roofer, dentist, lawyer"
        value={open ? query : selectedLabel}
        onFocus={() => {
          setOpen(true)
          setActive(0)
        }}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          setActive(0)
        }}
        onKeyDown={onKeyDown}
        // Let a click on an option land before the list closes.
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-md border border-border bg-white py-1 text-sm shadow-lg"
        >
          {groups.map((g) => (
            <li key={g.label} role="presentation">
              <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">{g.label}</p>
              <ul role="presentation">
                {g.options.map((o) => {
                  index++
                  const i = index
                  return (
                    <li
                      key={o.slug}
                      id={optionId(o.slug)}
                      role="option"
                      aria-selected={value === o.slug}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => choose(o.slug)}
                      onMouseEnter={() => setActive(i)}
                      className={cn(
                        'cursor-pointer px-3 py-1.5 text-dark',
                        i === active && 'bg-primary/10',
                        value === o.slug && 'font-medium'
                      )}
                    >
                      {o.name}
                    </li>
                  )
                })}
              </ul>
            </li>
          ))}
          {groups.length === 0 && (
            <li role="presentation" className="px-3 py-2 text-xs text-text-secondary">
              No industry matches “{query}”.
            </li>
          )}
          <li
            id={optionId(OTHER)}
            role="option"
            aria-selected={value === OTHER}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => choose(OTHER)}
            onMouseEnter={() => setActive(flat.length - 1)}
            className={cn(
              'mt-1 cursor-pointer border-t border-border px-3 py-2 text-primary',
              active === flat.length - 1 && 'bg-primary/10'
            )}
          >
            {otherLabel}
          </li>
        </ul>
      )}
    </div>
  )
}
