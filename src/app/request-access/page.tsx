import { notFound } from 'next/navigation'

/**
 * Turned off November 6, 2026: the page answers 404 and nothing links to it.
 * The backend stays (POST /api/access-requests, approval on /dashboard/users),
 * and the form is still in src/components/auth/RequestAccessForm.tsx. To turn
 * it back on, restore this page from git history (commit 8925065) and the
 * "Request access" link on /login (removed in 4c78af2).
 */
export default function RequestAccessPage() {
  notFound()
}
