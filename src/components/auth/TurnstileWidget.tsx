'use client'

import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'

type TurnstileApi = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string
  reset: (widgetId?: string) => void
  remove: (widgetId: string) => void
}

const turnstile = () => (window as unknown as { turnstile?: TurnstileApi }).turnstile

/**
 * Cloudflare Turnstile bot check. Calls onToken with each new token, and with
 * '' when it expires or fails. Change resetKey to get a fresh token after a
 * failed submit, since tokens are single use. Renders nothing without a site
 * key (local development).
 */
export function TurnstileWidget({
  siteKey,
  onToken,
  resetKey = 0,
}: {
  siteKey: string
  onToken: (token: string) => void
  resetKey?: number
}) {
  const [scriptReady, setScriptReady] = useState(false)
  const element = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)
  const onTokenRef = useRef(onToken)

  useEffect(() => {
    onTokenRef.current = onToken
  }, [onToken])

  useEffect(() => {
    const api = turnstile()
    if (!siteKey || !scriptReady || !api || !element.current) return
    widgetId.current = api.render(element.current, {
      sitekey: siteKey,
      callback: (value: string) => onTokenRef.current(value),
      'expired-callback': () => onTokenRef.current(''),
      'error-callback': () => onTokenRef.current(''),
    })
    return () => {
      if (widgetId.current) api.remove(widgetId.current)
      widgetId.current = null
    }
  }, [siteKey, scriptReady])

  useEffect(() => {
    if (resetKey && widgetId.current) {
      turnstile()?.reset(widgetId.current)
      onTokenRef.current('')
    }
  }, [resetKey])

  if (!siteKey) return null
  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      <div ref={element} />
    </>
  )
}
