'use client'

import { cn } from '@/lib/utils'

/** A submit button that asks for confirmation first. The form still works as a plain server action. */
export function ConfirmSubmit({
  message,
  children,
  className,
}: {
  message: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <button
      type="submit"
      className={cn(
        'inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
        className
      )}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault()
      }}
    >
      {children}
    </button>
  )
}
