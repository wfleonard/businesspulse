import Link from 'next/link'
import { notFound } from 'next/navigation'
import { TemplateForm } from '@/components/aeo/MailForms'
import { Card } from '@/components/ui/Card'
import { getTemplate } from '@/lib/aeo/outreach'
import { requireAdmin } from '@/lib/session'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Email template | BusinessPulse' }

type Props = { params: Promise<{ id: string }> }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function TemplatePage({ params }: Props) {
  await requireAdmin()
  const { id } = await params
  const template = id === 'new' ? null : UUID.test(id) ? await getTemplate(id) : null
  if (id !== 'new' && !template) notFound()

  return (
    <div className="space-y-6">
      <Link href="/dashboard/email/templates" className="text-sm text-primary hover:underline">
        ← Templates
      </Link>
      <h1 className="text-2xl font-bold text-dark">{template ? template.name : 'New template'}</h1>
      <Card>
        <TemplateForm template={template} />
      </Card>
    </div>
  )
}
