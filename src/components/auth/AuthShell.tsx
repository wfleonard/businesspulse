import Image from 'next/image'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'

/** Shared frame for sign-in, password, and access request pages: logo, card, and a way back to the site. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-12">
      <Link href="/" aria-label="BusinessPulse home">
        <Image
          src="/business-pulse-logo.webp"
          alt="BusinessPulse"
          width={1135}
          height={853}
          preload
          className="h-auto w-40"
        />
      </Link>
      <Card className="mt-6 w-full max-w-sm">
        <h1 className="text-xl font-bold text-dark">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </Card>
      {footer && <div className="mt-6 space-y-2 text-center text-sm text-text-secondary">{footer}</div>}
      <Link href="/" className="mt-8 text-xs text-text-secondary hover:text-dark">
        Back to businesspulse.app
      </Link>
    </main>
  )
}

export const inputClass =
  'w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'

export function Field({
  id,
  label,
  error,
  children,
}: {
  id: string
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-dark">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  )
}
