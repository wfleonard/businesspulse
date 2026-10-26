/** @jest-environment node */
import { adminAccessRequestEmail, passwordLinkEmail } from '../emails'
import { safeNext } from '../safe-next'
import { accessRequestSchema } from '../schema'

describe('accessRequestSchema', () => {
  it('trims, lowercases the email, and defaults the note', () => {
    const parsed = accessRequestSchema.parse({ name: '  Pat Lee ', email: ' Pat@Example.COM ' })
    expect(parsed).toEqual({ name: 'Pat Lee', email: 'pat@example.com', note: '' })
  })

  it('rejects a missing name, a bad email, and a very long note', () => {
    const result = accessRequestSchema.safeParse({ name: '', email: 'nope', note: 'x'.repeat(1001) })
    expect(result.success).toBe(false)
    const paths = result.error!.issues.map((i) => i.path[0])
    expect(paths).toEqual(expect.arrayContaining(['name', 'email', 'note']))
  })
})

describe('access emails', () => {
  it('welcomes a newly approved user and offers a reset to everyone else', () => {
    const welcome = passwordLinkEmail({ name: 'Pat', url: 'https://businesspulse.app/x', isNew: true })
    expect(welcome.subject).toBe('Your BusinessPulse access is approved')
    expect(welcome.text).toContain('Set your password: https://businesspulse.app/x')

    const reset = passwordLinkEmail({ name: 'Pat', url: 'https://businesspulse.app/x', isNew: false })
    expect(reset.subject).toBe('Reset your BusinessPulse password')
    expect(reset.text).toContain("If you didn't ask for this")
  })

  it('escapes what the requester typed', () => {
    const email = adminAccessRequestEmail({ name: '<b>Pat</b>', email: 'pat@example.com', note: '<script>' })
    expect(email.html).not.toContain('<script>')
    expect(email.html).toContain('&lt;b&gt;Pat&lt;/b&gt;')
  })

  it('never uses an em dash', () => {
    for (const isNew of [true, false]) {
      const { subject, html, text } = passwordLinkEmail({ name: 'Pat', url: 'u', isNew })
      expect(`${subject}${html}${text}`).not.toContain('—')
    }
  })
})

describe('safeNext', () => {
  it('keeps paths on this site', () => {
    expect(safeNext('/dashboard/aeo?status=new')).toBe('/dashboard/aeo?status=new')
  })

  it('falls back to the dashboard for anything else', () => {
    for (const value of [null, '', 'https://evil.example', '//evil.example', '/\\evil.example', 'dashboard']) {
      expect(safeNext(value)).toBe('/dashboard')
    }
  })
})
