import 'server-only'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

/** Returns the current session + user, or null if unauthenticated. */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() })
}

/**
 * Server-component / route guard: returns the session or redirects to /login.
 * Use in protected pages and server actions.
 */
export async function requireSession() {
  const session = await getSession()
  if (!session) redirect('/login')
  return session
}
