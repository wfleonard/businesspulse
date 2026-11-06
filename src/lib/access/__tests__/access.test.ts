/** @jest-environment node */
import { adminAccessRequestEmail, passwordLinkEmail, verifyEmailEmail } from '../emails'
import { isFreeEmail } from '../free-email'
import { safeNext } from '../safe-next'
import { signupOpen } from '../signup'
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

describe('sign-up', () => {
  const saved = process.env.BP_ALLOW_SIGNUP
  afterEach(() => {
    process.env.BP_ALLOW_SIGNUP = saved
  })

  it('stays closed unless BP_ALLOW_SIGNUP is exactly true', () => {
    for (const value of [undefined, '', 'false', '1', 'TRUE', 'yes']) {
      if (value === undefined) delete process.env.BP_ALLOW_SIGNUP
      else process.env.BP_ALLOW_SIGNUP = value
      expect(signupOpen()).toBe(false)
    }
    process.env.BP_ALLOW_SIGNUP = 'true'
    expect(signupOpen()).toBe(true)
  })

  it('sends a confirmation email with the link and no em dash', () => {
    const email = verifyEmailEmail({ name: '<Pat>', url: 'https://businesspulse.app/api/auth/verify-email?token=t' })
    expect(email.subject).toBe('Confirm your BusinessPulse account')
    expect(email.text).toContain('Confirm my email: https://businesspulse.app/api/auth/verify-email?token=t')
    expect(email.html).toContain('Hi &lt;Pat&gt;,')
    expect(`${email.subject}${email.html}${email.text}`).not.toContain('—')
  })
})

describe('isFreeEmail', () => {

  it('refuses free and throwaway providers, in any case and country ending', () => {
    for (const email of [
      'pat@gmail.com',
      'Pat@YAHOO.com',
      'pat@yahoo.co.uk',
      'pat@hotmail.fr',
      'pat@outlook.com',
      'pat@aol.com',
      'pat@msn.com',
      'pat@me.com',
      'pat@icloud.com',
      'pat@comcast.net',
      'pat@mailinator.com',
      ' pat@gmail.com. ',
    ]) {
      expect(isFreeEmail(email)).toBe(true)
    }
  })

  it('accepts company addresses, including company mail subdomains', () => {
    for (const email of [
      'wfleonard@saxonenterprises.net',
      'pat@acme.com',
      'pat@outlook.acme.com',
      'pat@mail.acme.co.uk',
      'pat@gmailer.com',
    ]) {
      expect(isFreeEmail(email)).toBe(false)
    }
  })
})
