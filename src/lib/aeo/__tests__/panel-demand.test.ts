/** @jest-environment node */
jest.mock('@/lib/db', () => ({ db: {} }))

import { adminPanelDemandEmail } from '@/lib/access/emails'
import { demandThreshold, industrySlug } from '../panel-demand'
import { siteTextFromPages } from '../plan'

describe('panel demand', () => {
  it('turns an industry name into a stable backlog slug', () => {
    expect(industrySlug('Commercial Kitchen Equipment Repair')).toBe('commercial-kitchen-equipment-repair')
    expect(industrySlug('  Bed & Breakfast Inns ')).toBe('bed-and-breakfast-inns')
    expect(industrySlug('Café Catering')).toBe('cafe-catering')
    expect(industrySlug('!!')).toBe('')
  })

  it('emails the admin at three businesses unless set', () => {
    expect(demandThreshold({})).toBe(3)
    expect(demandThreshold({ AEO_PANEL_DEMAND_THRESHOLD: '5' })).toBe(5)
    expect(demandThreshold({ AEO_PANEL_DEMAND_THRESHOLD: '0' })).toBe(3)
  })

  it('links the admin to the backlog entry', () => {
    process.env.BETTER_AUTH_URL = 'https://businesspulse.app'
    const email = adminPanelDemandEmail({ industry: 'wedding bands', count: 3, slug: 'wedding-bands' })
    expect(email.subject).toBe('[BusinessPulse] Panel worth building: wedding bands')
    expect(email.text).toContain('3 businesses have run a free snapshot for "wedding bands"')
    expect(email.text).toContain('https://businesspulse.app/dashboard/panels/backlog/wedding-bands')
  })
})

describe('siteTextFromPages', () => {
  it('quotes each page under its path, homepage first, within the size limit', () => {
    const text = siteTextFromPages([
      { url: 'https://acme.com/', title: 'Acme', text: 'We repair commercial ovens.' },
      { url: 'https://acme.com/services', title: '', text: 'Walk-in coolers too.' },
      { url: 'https://acme.com/empty', title: 'Empty', text: '' },
    ])
    expect(text).toBe('Page: / (Acme)\nWe repair commercial ovens.\n\nPage: /services\nWalk-in coolers too.')
    expect(siteTextFromPages([])).toBeNull()
    expect(siteTextFromPages([{ url: 'https://a.com/', title: '', text: 'x'.repeat(50_000) }])!.length).toBeLessThanOrEqual(30_000)
  })
})
