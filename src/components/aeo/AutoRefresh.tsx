'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Re-renders the current server page on an interval, e.g. while a report is being prepared. */
export function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter()

  useEffect(() => {
    const timer = setInterval(() => router.refresh(), seconds * 1000)
    return () => clearInterval(timer)
  }, [router, seconds])

  return null
}
