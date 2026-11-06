import { NextResponse } from 'next/server'

/**
 * Turned off November 6, 2026, with the /request-access page: every request
 * gets 404 and nothing is saved or emailed. createAccessRequest and
 * notifyAccessRequest in src/lib/access/requests.ts are kept. To turn it back
 * on, restore this route from git history (commit 8925065).
 */
export function POST() {
  return NextResponse.json({ error: 'Not found.' }, { status: 404 })
}
