import { appUrl, escapeHtml, type EmailContent } from '@/lib/aeo/emails'

/** Account access emails. Same plain style as the AEO emails; copy avoids em dashes. */

/** How long a set-password or reset link works. Matches resetPasswordTokenExpiresIn in auth.ts. */
export const PASSWORD_LINK_HOURS = 24

const page = (body: string) =>
  `<!doctype html><html><body style="margin:0;padding:24px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#0f172a">${body}</body></html>`

export function adminAccessRequestEmail(args: { name: string; email: string; note: string }): EmailContent {
  const review = appUrl('/dashboard/users')
  const facts: [string, string][] = [
    ['Name', args.name],
    ['Email', args.email],
    ['Why', args.note || '(not given)'],
  ]
  const rows = facts
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#64748b;vertical-align:top">${label}</td><td style="padding:4px 0;color:#0f172a;word-break:break-word;white-space:pre-wrap">${escapeHtml(value)}</td></tr>`
    )
    .join('')
  return {
    subject: `[BusinessPulse] Access request: ${args.name} (${args.email})`,
    html: page(`<p style="margin:0 0 16px">Someone asked for a BusinessPulse login. Anyone you approve can see every lead and report.</p>
<table style="border-collapse:collapse">${rows}</table>
<p style="margin:16px 0 0"><a href="${escapeHtml(review)}" style="color:#2563eb">Approve or decline it</a></p>`),
    text: [
      'Someone asked for a BusinessPulse login. Anyone you approve can see every lead and report.',
      '',
      ...facts.map(([label, value]) => `${label}: ${value}`),
      '',
      `Approve or decline it: ${review}`,
    ].join('\n'),
  }
}

/**
 * The link from better-auth's reset flow. A user with no password yet was just
 * approved, so they get a welcome; everyone else asked to reset.
 */
export function passwordLinkEmail(args: { name: string; url: string; isNew: boolean }): EmailContent {
  const greeting = `Hi ${args.name},`
  const lead = args.isNew
    ? 'Your BusinessPulse access is approved. Set a password to sign in.'
    : 'We got a request to reset your BusinessPulse password.'
  const action = args.isNew ? 'Set your password' : 'Reset your password'
  const after = args.isNew
    ? `The link works for ${PASSWORD_LINK_HOURS} hours. If it expires, use "Forgot password" on the sign-in page for a new one.`
    : `The link works for ${PASSWORD_LINK_HOURS} hours. If you didn't ask for this, ignore this email and your password stays the same.`
  return {
    subject: args.isNew ? 'Your BusinessPulse access is approved' : 'Reset your BusinessPulse password',
    html: page(`<p style="margin:0 0 12px">${escapeHtml(greeting)}</p>
<p style="margin:0 0 16px">${lead}</p>
<p style="margin:0 0 16px"><a href="${escapeHtml(args.url)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:bold">${action}</a></p>
<p style="margin:0;color:#64748b">${escapeHtml(after)}</p>`),
    text: [greeting, '', lead, '', `${action}: ${args.url}`, '', after].join('\n'),
  }
}
