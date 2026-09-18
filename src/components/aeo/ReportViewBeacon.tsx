'use client'

import { useEffect, useRef } from 'react'

/** Tells the server a person opened the finished report. Renders nothing; failures are ignored. */
export function ReportViewBeacon({ publicId }: { publicId: string }) {
  const sent = useRef(false)

  useEffect(() => {
    // React may run effects twice in development; send once.
    if (sent.current) return
    sent.current = true
    fetch('/api/aeo/report-views', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ publicId }),
      keepalive: true,
    }).catch(() => {})
  }, [publicId])

  return null
}
