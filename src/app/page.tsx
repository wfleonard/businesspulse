import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <span className="mb-3 rounded bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
        BusinessPulse
      </span>
      <h1 className="max-w-2xl text-4xl font-bold text-dark">
        Dashboards, alerts, and AI insights for everyday business decisions.
      </h1>
      <p className="mt-4 max-w-xl text-text-secondary">
        Connect your business data. Ask questions. Get alerts. Understand what
        changed. Know what to do next.
      </p>
      <div className="mt-8">
        <Link href="/login">
          <Button>Sign in</Button>
        </Link>
      </div>
    </main>
  )
}
