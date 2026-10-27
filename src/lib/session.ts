import 'server-only'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

/** Returns the current session + user, or null if unauthenticated. */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() })
}

type Session = NonNullable<Awaited<ReturnType<typeof getSession>>>

export function isAdmin(session: Session | null): boolean {
  return session?.user.role === 'admin'
}

/**
 * Server-component / route guard: returns the session or redirects to /login.
 * Any signed-in user passes, customers included: use it only for /account.
 */
export async function requireSession() {
  const session = await getSession()
  if (!session) redirect('/login')
  return session
}

/**
 * Guard for everything under /dashboard, including each server action and the
 * CSV export: admins see every lead. Signed out goes to /login; a customer
 * goes to their own account.
 */
export async function requireAdmin() {
  const session = await requireSession()
  if (!isAdmin(session)) redirect('/account')
  return session
}
