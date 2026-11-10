import { NextResponse } from 'next/server'
import { getBusiness } from '@/lib/account/business'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * What the free snapshot form can fill in for a signed-in visitor: their own
 * business profile and email. The homepage stays static and asks for this
 * after it loads. Signed out, or no business yet, it answers with nothing.
 */
export async function GET() {
  const headers = { 'cache-control': 'private, no-store' }
  const session = await getSession()
  if (!session) return NextResponse.json({}, { headers })
  const owned = await getBusiness(session.user.id)
  return NextResponse.json(
    {
      email: session.user.email,
      ...(owned
        ? {
            businessName: owned.name,
            website: owned.domain,
            service: owned.service,
            city: owned.city,
            state: owned.state,
            vertical: owned.panelSlug ?? 'other',
          }
        : {}),
    },
    { headers }
  )
}
