import Image from 'next/image'
import Link from 'next/link'

/** Header for public content pages (the Resource Hub). */
export function PublicHeader() {
  return (
    <header className="border-b border-border bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" aria-label="BusinessPulse home" className="inline-block">
          <Image
            src="/business-pulse-logo.webp"
            alt="BusinessPulse"
            width={1135}
            height={853}
            className="h-auto w-24 sm:w-28"
          />
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/resources" className="text-text-secondary hover:text-dark">
            Resources
          </Link>
          <Link href="/" className="rounded-md bg-primary px-3 py-1.5 font-medium text-white hover:bg-primary/90">
            Free snapshot
          </Link>
        </nav>
      </div>
    </header>
  )
}
