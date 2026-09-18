'use client'

import { useState } from 'react'

/** Copies text to the clipboard, e.g. a report link to paste into an email. */
export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        } catch {
          setCopied(false)
        }
      }}
      className="rounded-md border border-border bg-white px-2 py-1 text-xs font-medium text-dark hover:bg-gray-50"
    >
      {copied ? 'Copied' : label}
    </button>
  )
}
