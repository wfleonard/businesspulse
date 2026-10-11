import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { listTemplates } from '@/lib/aeo/outreach'
import { requireSession } from '@/lib/session'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Email templates | BusinessPulse' }

export default async function TemplatesPage() {
  await requireSession()
  const templates = await listTemplates()

  return (
    <div className="space-y-6">
      <Link href="/dashboard/email" className="text-sm text-primary hover:underline">
        ← Email
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark">Email templates</h1>
          <p className="mt-1 text-text-secondary">Starting points for follow-ups. Each email can still be edited before it goes out.</p>
        </div>
        <Link
          href="/dashboard/email/templates/new"
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90"
        >
          New template
        </Link>
      </div>
      <Card className="p-0">
        <ul>
          {templates.length === 0 && <li className="px-4 py-6 text-center text-sm text-text-secondary">No templates yet.</li>}
          {templates.map((t) => (
            <li key={t.id} className="border-b border-border px-4 py-3 last:border-0">
              <Link href={`/dashboard/email/templates/${t.id}`} className="font-medium text-primary hover:underline">
                {t.name}
              </Link>
              {!t.isActive && <span className="ml-2 rounded bg-gray-100 px-1.5 text-xs text-text-secondary">hidden</span>}
              <p className="text-sm text-dark">{t.subject}</p>
              {t.description && <p className="text-xs text-text-secondary">{t.description}</p>}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
