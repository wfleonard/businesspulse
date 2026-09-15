/**
 * AEO email content. Plain HTML plus a text twin, sent through
 * src/lib/email/provider.ts. Copy avoids em dashes.
 */

export type EmailContent = { subject: string; html: string; text: string }

/**
 * Absolute app URL for links in emails. Built from server configuration, never
 * from the request's Host header, so a forged header can't redirect a link.
 */
export function appUrl(path: string): string {
  const base = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${base.replace(/\/+$/, '')}${path}`
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function layout(paragraphs: string[], button: { label: string; url: string }, footer: string): string {
  const body = paragraphs
    .map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#0f172a">${p}</p>`)
    .join('')
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:28px">
<p style="margin:0 0 20px;font-size:13px;font-weight:bold;color:#2563eb">BusinessPulse</p>
${body}
<p style="margin:24px 0"><a href="${escapeHtml(button.url)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold;padding:12px 20px;border-radius:6px">${escapeHtml(button.label)}</a></p>
<p style="margin:0;font-size:13px;line-height:1.5;color:#64748b">${footer}</p>
</div></body></html>`
}

export function verificationEmail(args: {
  businessName: string
  domain: string
  verifyUrl: string
}): EmailContent {
  const name = escapeHtml(args.businessName)
  const domain = escapeHtml(args.domain)
  return {
    subject: `Confirm your AI visibility snapshot for ${args.domain}`,
    html: layout(
      [
        `Thanks for requesting a free AI visibility snapshot for <strong>${name}</strong> (${domain}).`,
        'Confirm your email and we will start it right away. It usually takes a few minutes.',
      ],
      { label: 'Confirm and run my snapshot', url: args.verifyUrl },
      `This link expires in 24 hours. If you did not request this, ignore this email and nothing will run.<br><br>If the button does not work, paste this link into your browser:<br>${escapeHtml(args.verifyUrl)}`
    ),
    text: [
      `Thanks for requesting a free AI visibility snapshot for ${args.businessName} (${args.domain}).`,
      '',
      'Confirm your email and we will start it right away. It usually takes a few minutes:',
      args.verifyUrl,
      '',
      'This link expires in 24 hours. If you did not request this, ignore this email and nothing will run.',
    ].join('\n'),
  }
}

export function reportReadyEmail(args: {
  businessName: string
  domain: string
  reportUrl: string
  citedCount?: number | null
  questionCount?: number | null
}): EmailContent {
  const name = escapeHtml(args.businessName)
  const hasScore = typeof args.citedCount === 'number' && typeof args.questionCount === 'number'
  const score = hasScore
    ? `AI search cited ${args.domain} on ${args.citedCount} of ${args.questionCount} buyer questions.`
    : null

  return {
    subject: `Your AI visibility snapshot for ${args.domain} is ready`,
    html: layout(
      [
        `Your AI visibility snapshot for <strong>${name}</strong> is ready.`,
        ...(score ? [escapeHtml(score)] : []),
        'The report shows which questions cite your website, and who gets cited when it does not.',
      ],
      { label: 'View my report', url: args.reportUrl },
      `Anyone with this link can view the report, so share it only with people you trust.<br><br>${escapeHtml(args.reportUrl)}`
    ),
    text: [
      `Your AI visibility snapshot for ${args.businessName} is ready.`,
      ...(score ? ['', score] : []),
      '',
      'View your report:',
      args.reportUrl,
      '',
      'Anyone with this link can view the report, so share it only with people you trust.',
    ].join('\n'),
  }
}
