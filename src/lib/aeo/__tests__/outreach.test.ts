/** @jest-environment node */
import { fieldsUsed, merge, renderMail, unknownFields } from '../mail-format'
import { MAIL_TEMPLATES } from '../mail-templates'
import { leadFields, outreachConfig } from '../outreach'

const lead = {
  businessName: 'Acme [Roofing](https://evil.example) **LLC**',
  domain: 'acmeroofing.com',
  service: 'roof replacement',
  city: 'Red Bank',
  state: 'NJ',
  panelName: 'Residential roofing',
  publicId: 'abc123',
  citedCount: 3,
  questionCount: 20,
}

describe('merge fields', () => {
  it('fills fields and reports missing ones, leaving email addresses alone', () => {
    const out = merge('Hi @business, write to bill@saxon.example about @nothing', { business: 'Acme' })
    expect(out.text).toBe('Hi Acme, write to bill@saxon.example about @nothing')
    expect(out.missing).toEqual(['nothing'])
    expect(fieldsUsed('a@b.com @domain @domain')).toEqual(['domain'])
  })

  it('flags fields no lead can fill', () => {
    expect(unknownFields('@business @firstname @score')).toEqual(['firstname'])
  })
})

describe('leadFields', () => {
  const fields = leadFields(lead)

  it('strips Markdown from typed values and spells out the state', () => {
    expect(fields.business).toBe('Acme Roofing(https://evil.example) LLC')
    expect(fields.state).toBe('New Jersey')
    expect(fields.score).toBe('3 of 20')
    expect(fields.report_url).toMatch(/\/report\/abc123$/)
    expect(fields.book_url).toMatch(/\/book\?r=abc123$/)
  })

  it('leaves the score blank without a finished count', () => {
    expect(leadFields({ ...lead, citedCount: null, questionCount: null }).score).toBe('')
  })
})

describe('renderMail', () => {
  it('renders links from merged URLs, escapes HTML, and adds the unsubscribe footer', () => {
    const md = merge('Hello <b>there</b>\n\n[view your report](@report_url)\n\n- one\n- two', leadFields(lead)).text
    const { html, text } = renderMail(md, { unsubscribeUrl: 'https://x.example/u?token=t', postalAddress: '1 Main St' })
    expect(html).toContain('&lt;b&gt;there&lt;/b&gt;')
    expect(html).toMatch(/<a href="https?:\/\/[^"]+\/report\/abc123"[^>]*>view your report<\/a>/)
    expect(html).toContain('<ul')
    expect(html).toContain('https://x.example/u?token=t')
    expect(html).toContain('1 Main St')
    expect(text).toMatch(/view your report \(https?:\/\/\S+\/report\/abc123\)/)
    expect(text).toContain('Unsubscribe: https://x.example/u?token=t')
  })
})

describe('starter templates', () => {
  it('have unique slugs, known fields only, and no em dashes', () => {
    expect(new Set(MAIL_TEMPLATES.map((t) => t.slug)).size).toBe(MAIL_TEMPLATES.length)
    for (const t of MAIL_TEMPLATES) {
      expect(t.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      expect(unknownFields(`${t.subject}\n${t.body}`)).toEqual([])
      expect(`${t.subject}${t.body}`).not.toMatch(/—/)
    }
  })

  it('fill completely for a lead with a finished report', () => {
    const fields = leadFields(lead)
    for (const t of MAIL_TEMPLATES) expect(merge(`${t.subject}\n${t.body}`, fields).missing).toEqual([])
  })
})

describe('outreachConfig', () => {
  it('falls back to the Mailtrap sender and the contact address', () => {
    const c = outreachConfig({ MAILTRAP_SENDER: 'alerts@bp.example', AEO_CONTACT_EMAIL: 'bill@bp.example' })
    expect(c.from).toEqual({ email: 'alerts@bp.example', name: 'Bill Leonard' })
    expect(c.replyTo).toEqual({ email: 'bill@bp.example' })
    expect(c.testTo).toBe('bill@bp.example')
  })

  it('uses the outreach settings when set', () => {
    const c = outreachConfig({
      OUTREACH_FROM: 'bill@bp.example',
      OUTREACH_FROM_NAME: 'Bill',
      OUTREACH_REPLY_TO: 'inbox@saxon.example',
      OUTREACH_BCC: 'copy@saxon.example, two@saxon.example',
    })
    expect(c.from).toEqual({ email: 'bill@bp.example', name: 'Bill' })
    expect(c.replyTo).toEqual({ email: 'inbox@saxon.example' })
    expect(c.bcc).toEqual(['copy@saxon.example', 'two@saxon.example'])
    expect(c.testTo).toBe('copy@saxon.example')
  })

  it('has no sender without an address', () => {
    expect(outreachConfig({}).from).toBeNull()
  })
})
