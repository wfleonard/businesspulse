'use client'

import { useEffect } from 'react'

/** Opens the question a "What to fix" link points to, so its answers show without another click. */
export function OpenOnHash() {
  useEffect(() => {
    const open = () => {
      const id = decodeURIComponent(window.location.hash.slice(1))
      if (!id) return
      const details = document.getElementById(id)?.querySelector('details')
      if (details) details.open = true
    }
    open()
    window.addEventListener('hashchange', open)
    return () => window.removeEventListener('hashchange', open)
  }, [])
  return null
}
