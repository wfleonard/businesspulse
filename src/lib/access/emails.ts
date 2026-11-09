import { appUrl, escapeHtml, type EmailContent } from '@/lib/aeo/emails'
import { VERIFY_LINK_HOURS } from './signup'

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

/** Sent on sign-up, and again if they try to sign in before confirming. */
export function verifyEmailEmail(args: { name: string; url: string }): EmailContent {
  const greeting = `Hi ${args.name},`
  const lead = 'Confirm your email to finish setting up your BusinessPulse account.'
  const after = `The link works for ${VERIFY_LINK_HOURS} hours. If you didn't create an account, ignore this email.`
  return {
    subject: 'Confirm your BusinessPulse account',
    html: page(`<p style="margin:0 0 12px">${escapeHtml(greeting)}</p>
<p style="margin:0 0 16px">${lead}</p>
<p style="margin:0 0 16px"><a href="${escapeHtml(args.url)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:bold">Confirm my email</a></p>
<p style="margin:0;color:#64748b">${escapeHtml(after)}</p>`),
    text: [greeting, '', lead, '', `Confirm my email: ${args.url}`, '', after].join('\n'),
  }
}

/** The site deep dive is done: the client should confirm what we found. */
export function briefReadyEmail(args: { name: string; businessName: string }): EmailContent {
  const url = appUrl('/account/brief')
  const greeting = `Hi ${args.name},`
  const lead = `We've read ${args.businessName}'s website. Please check what we found: the services you sell, who buys, and where you work.`
  const after = 'Your report questions are built from it, so fixing anything we got wrong now keeps your report accurate.'
  return {
    subject: `Please confirm what we found about ${args.businessName}`,
    html: page(`<p style="margin:0 0 12px">${escapeHtml(greeting)}</p>
<p style="margin:0 0 16px">${escapeHtml(lead)}</p>
<p style="margin:0 0 16px"><a href="${escapeHtml(url)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:bold">Review and confirm</a></p>
<p style="margin:0;color:#64748b">${escapeHtml(after)}</p>`),
    text: [greeting, '', lead, '', `Review and confirm: ${url}`, '', after].join('\n'),
  }
}

/** For the admin: a client confirmed their brief, so their panel can be drafted. */
export function adminBriefConfirmedEmail(args: { businessName: string; domain: string; email: string; businessId: string }): EmailContent {
  const url = appUrl(`/dashboard/pulse/${args.businessId}`)
  const lead = `${args.businessName} (${args.domain}, ${args.email}) confirmed their business brief.`
  return {
    subject: `[BusinessPulse] Brief confirmed: ${args.businessName}`,
    html: page(`<p style="margin:0 0 16px">${escapeHtml(lead)}</p>
<p style="margin:0"><a href="${escapeHtml(url)}" style="color:#2563eb">See the brief and their changes</a></p>`),
    text: [lead, '', `See the brief and their changes: ${url}`].join('\n'),
  }
}

/** For the admin: a business panel draft is ready to review. */
export function adminPanelDraftEmail(args: { businessName: string; businessId: string; version: number; questions: number }): EmailContent {
  const url = appUrl(`/dashboard/pulse/${args.businessId}`)
  const lead = `A ${args.questions}-question panel (version ${args.version}) is drafted for ${args.businessName} and waiting for your review.`
  return {
    subject: `[BusinessPulse] Panel to review: ${args.businessName}`,
    html: page(`<p style="margin:0 0 16px">${escapeHtml(lead)}</p>
<p style="margin:0"><a href="${escapeHtml(url)}" style="color:#2563eb">Review and approve it</a></p>`),
    text: [lead, '', `Review and approve it: ${url}`].join('\n'),
  }
}

/** A client's Pulse report, with What to fix, is ready in their account. */
export function pulseReportReadyEmail(args: { name: string; businessName: string; publicId: string; cited: number; questions: number }): EmailContent {
  const url = appUrl(`/account/reports/${args.publicId}`)
  const greeting = `Hi ${args.name},`
  const lead = `Your AI search report for ${args.businessName} is ready. ChatGPT, Claude, Perplexity, or Gemini cited your website on ${args.cited} of ${args.questions} questions your buyers ask.`
  const after = 'The report shows every question and answer, who was cited instead, and what to fix first.'
  return {
    subject: `Your AI search report for ${args.businessName} is ready`,
    html: page(`<p style="margin:0 0 12px">${escapeHtml(greeting)}</p>
<p style="margin:0 0 16px">${escapeHtml(lead)}</p>
<p style="margin:0 0 16px"><a href="${escapeHtml(url)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:bold">Read your report</a></p>
<p style="margin:0;color:#64748b">${escapeHtml(after)} Sign in with this email address to open it.</p>`),
    text: [greeting, '', lead, '', `Read your report: ${url}`, '', `${after} Sign in with this email address to open it.`].join('\n'),
  }
}

const dollars = (cents: number) => `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`

/** A plain client email with one button to their account. */
function accountEmail(args: { name: string; subject: string; lead: string; detail?: string; action: string; after: string }): EmailContent {
  const url = appUrl('/account')
  const greeting = `Hi ${args.name},`
  const detail = args.detail ? `<p style="margin:0 0 16px;white-space:pre-wrap">${escapeHtml(args.detail)}</p>` : ''
  return {
    subject: args.subject,
    html: page(`<p style="margin:0 0 12px">${escapeHtml(greeting)}</p>
<p style="margin:0 0 16px">${escapeHtml(args.lead)}</p>
${detail}<p style="margin:0 0 16px"><a href="${escapeHtml(url)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:bold">${escapeHtml(args.action)}</a></p>
<p style="margin:0;color:#64748b">${escapeHtml(args.after)}</p>`),
    text: [greeting, '', args.lead, ...(args.detail ? ['', args.detail] : []), '', `${args.action}: ${url}`, '', args.after].join('\n'),
  }
}

/** For the admin: a client asked for the fix. */
export function adminFixRequestedEmail(args: { businessName: string; email: string; issues: number; id: string }): EmailContent {
  const url = appUrl(`/dashboard/pulse/fix/${args.id}`)
  const lead = `${args.businessName} (${args.email}) asked you to fix the ${args.issues} issues in their Pulse report.`
  return {
    subject: `[BusinessPulse] Fix requested: ${args.businessName}`,
    html: page(`<p style="margin:0 0 16px">${escapeHtml(lead)}</p>
<p style="margin:0"><a href="${escapeHtml(url)}" style="color:#2563eb">Confirm the scope and send the payment request</a></p>`),
    text: [lead, '', `Confirm the scope and send the payment request: ${url}`].join('\n'),
  }
}

/** For the admin: a client paid for the fix. */
export function adminFixPaidEmail(args: { businessName: string; totalCents: number; id: string }): EmailContent {
  const url = appUrl(`/dashboard/pulse/fix/${args.id}`)
  const lead = `${args.businessName} paid ${dollars(args.totalCents)} (with tax) for their fix. Time to start the work.`
  return {
    subject: `[BusinessPulse] Fix paid: ${args.businessName}`,
    html: page(`<p style="margin:0 0 16px">${escapeHtml(lead)}</p>
<p style="margin:0"><a href="${escapeHtml(url)}" style="color:#2563eb">Open the request</a></p>`),
    text: [lead, '', `Open the request: ${url}`].join('\n'),
  }
}

/** The scope is confirmed: the client can pay from their account. */
export function fixQuotedEmail(args: { name: string; businessName: string; amountCents: number; scope: string }): EmailContent {
  return accountEmail({
    name: args.name,
    subject: `Your fix for ${args.businessName} is ready to start`,
    lead: `We've confirmed what we'll fix on ${args.businessName}'s website: ${dollars(args.amountCents)}, one time, plus sales tax for New Jersey buyers.`,
    detail: args.scope || undefined,
    action: 'Review and pay',
    after: 'We start as soon as payment comes through, and your account shows the progress.',
  })
}

export function fixDoneEmail(args: { name: string; businessName: string; note: string }): EmailContent {
  return accountEmail({
    name: args.name,
    subject: `The fixes for ${args.businessName} are done`,
    lead: `We've finished the fixes on ${args.businessName}'s website.`,
    detail: args.note || undefined,
    action: 'Open your account',
    after: 'AI assistants take a while to notice changes. Your next Pulse report shows what changed since the fix.',
  })
}

export function fixDeclinedEmail(args: { name: string; businessName: string; note: string }): EmailContent {
  return accountEmail({
    name: args.name,
    subject: `About your fix request for ${args.businessName}`,
    lead: `We can't take on the fix request for ${args.businessName} as it stands. You haven't been charged.`,
    detail: args.note || undefined,
    action: 'Open your account',
    after: 'Reply to this email if you have questions.',
  })
}

/**
 * The one email the Monitor waitlist asked for: Monitor didn't open, Pulse
 * did. Sent once per address from the dashboard.
 */
export function pulseLaunchEmail(args: { domain: string }): EmailContent {
  const url = appUrl('/pulse')
  const lead = `You asked us to tell you when BusinessPulse Monitor opened for ${args.domain}. We built something better instead, and it's open now: Pulse.`
  const points = [
    'Your own buyer questions, written from your website and checked by us, not a generic list for your industry.',
    'Asked of ChatGPT, Claude, Perplexity, and Gemini, with every answer and who they cite instead of you.',
    'A list of what to fix on your site, each item tied to the questions it affects.',
    `${dollars(10_000)} per report, plus sales tax for New Jersey buyers. No subscription: run one whenever you like, up to once every 30 days.`,
  ]
  const after = "This is the one email you asked for. We won't write to you about Monitor again."
  return {
    subject: 'BusinessPulse Pulse is open',
    html: page(`<p style="margin:0 0 16px">${escapeHtml(lead)}</p>
<ul style="margin:0 0 16px;padding-left:20px">${points.map((p) => `<li style="margin:0 0 6px">${escapeHtml(p)}</li>`).join('')}</ul>
<p style="margin:0 0 16px"><a href="${escapeHtml(url)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:bold">See how Pulse works</a></p>
<p style="margin:0;color:#64748b">${escapeHtml(after)}</p>`),
    text: [lead, '', ...points.map((p) => `- ${p}`), '', `See how Pulse works: ${url}`, '', after].join('\n'),
  }
}

/** For the admin: enough snapshots asked about an industry with no panel to be worth building one. */
export function adminPanelDemandEmail(args: { industry: string; count: number; slug: string }): EmailContent {
  const url = appUrl(`/dashboard/panels/backlog/${args.slug}`)
  const lead = `${args.count} businesses have run a free snapshot for "${args.industry}", which has no industry panel yet. Their questions were written on the spot from each website.`
  const after = 'Draft a panel from the backlog page, review it, and publish it, and future snapshots in this industry use it.'
  return {
    subject: `[BusinessPulse] Panel worth building: ${args.industry}`,
    html: page(`<p style="margin:0 0 16px">${escapeHtml(lead)}</p>
<p style="margin:0 0 16px"><a href="${escapeHtml(url)}" style="color:#2563eb">Open it on the backlog</a></p>
<p style="margin:0;color:#64748b">${escapeHtml(after)}</p>`),
    text: [lead, '', `Open it on the backlog: ${url}`, '', after].join('\n'),
  }
}
