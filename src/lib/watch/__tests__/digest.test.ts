import { composeDigest } from '@/lib/watch/digest'

const base = {
  orgName: 'Acme Co',
  appUrl: 'https://app.test',
  alerts: [],
  changes: [],
  insights: [],
}

describe('composeDigest', () => {
  it('summarizes counts in the subject', () => {
    const d = composeDigest({
      ...base,
      alerts: [{ severity: 'critical', message: 'Revenue dropped 20%.' }],
      changes: [
        { key: 'x', label: 'Leads', pctChange: 12, current: 200, previous: 178, sentiment: 'good' },
      ],
    })
    expect(d.itemCount).toBe(2)
    expect(d.subject).toBe('Good morning — 2 things changed at Acme Co')
  })

  it('uses singular "thing" for one item', () => {
    const d = composeDigest({
      ...base,
      alerts: [{ severity: 'warning', message: 'Estimates below target.' }],
    })
    expect(d.subject).toContain('1 thing changed')
  })

  it('reports all-quiet when nothing changed', () => {
    const d = composeDigest(base)
    expect(d.itemCount).toBe(0)
    expect(d.subject).toMatch(/all quiet/i)
  })

  it('includes messages and a dashboard link in html + text', () => {
    const d = composeDigest({
      ...base,
      alerts: [{ severity: 'critical', message: 'Revenue dropped 20%.' }],
      insights: [{ metricKey: 'monthly_revenue', summary: 'Fewer jobs closed.' }],
    })
    expect(d.html).toContain('Revenue dropped 20%.')
    expect(d.html).toContain('https://app.test/dashboard')
    expect(d.text).toContain('Fewer jobs closed.')
  })

  it('escapes HTML in user-supplied content', () => {
    const d = composeDigest({
      ...base,
      orgName: '<script>alert(1)</script>',
      alerts: [{ severity: 'info', message: '<b>x</b>' }],
    })
    expect(d.html).not.toContain('<script>alert(1)</script>')
    expect(d.html).toContain('&lt;b&gt;x&lt;/b&gt;')
  })
})
