import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Dev-only mock "customer API" used as a connector test bed. Returns monthly
 * rows with two metrics (leads + ad spend). Disabled outside development.
 *
 * Point an API data source at:  GET {app}/api/dev/mock-metrics  (rowsPath "data")
 */
const DATA = [
  { month_start: '2026-01-01', month_end: '2026-01-31', leads: 120, ad_spend: 3000 },
  { month_start: '2026-02-01', month_end: '2026-02-28', leads: 138, ad_spend: 3200 },
  { month_start: '2026-03-01', month_end: '2026-03-31', leads: 165, ad_spend: 3100 },
  { month_start: '2026-04-01', month_end: '2026-04-30', leads: 151, ad_spend: 3600 },
  { month_start: '2026-05-01', month_end: '2026-05-31', leads: 182, ad_spend: 3400 },
  { month_start: '2026-06-01', month_end: '2026-06-30', leads: 205, ad_spend: 3300 },
]

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
  return NextResponse.json({ data: DATA })
}
