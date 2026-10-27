import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/session'

export default async function DashboardPage() {
  await requireAdmin()
  redirect('/dashboard/aeo')
}
