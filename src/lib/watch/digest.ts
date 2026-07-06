import { formatPct } from '@/lib/metrics/period'
import type { AlertSeverity, MaterialChange, TriggeredAlert } from './rules'

/** AI (or deterministic) explanation of a change, for the digest + insights. */
export type InsightLite = { metricKey: string | null; summary: string }

export type DigestInput = {
  orgName: string
  appUrl: string
  alerts: Pick<TriggeredAlert, 'severity' | 'message'>[]
  changes: MaterialChange[]
  insights: InsightLite[]
  intro?: string
}

export type Digest = { subject: string; html: string; text: string; itemCount: number }

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

const dotColor: Record<AlertSeverity, string> = {
  critical: '#dc2626',
  warning: '#d97706',
  info: '#2563eb',
}

/** Compose the "Good morning — N things changed" digest. Pure & testable. */
export function composeDigest(input: DigestInput): Digest {
  const { orgName, appUrl, alerts, changes, insights, intro } = input
  const itemCount = alerts.length + changes.length

  const noun = itemCount === 1 ? 'thing' : 'things'
  const subject =
    itemCount === 0
      ? `BusinessPulse: all quiet at ${orgName}`
      : `Good morning — ${itemCount} ${noun} changed at ${orgName}`

  // --- Plain text ---
  const textLines: string[] = [subject, '']
  if (intro) textLines.push(intro, '')
  if (alerts.length) {
    textLines.push('ALERTS')
    for (const a of alerts) textLines.push(`- [${a.severity}] ${a.message}`)
    textLines.push('')
  }
  if (changes.length) {
    textLines.push('WHAT MOVED')
    for (const c of changes) textLines.push(`- ${c.label}: ${formatPct(c.pctChange)}`)
    textLines.push('')
  }
  if (insights.length) {
    textLines.push('WHY')
    for (const i of insights) textLines.push(`- ${i.summary}`)
    textLines.push('')
  }
  textLines.push(`Open BusinessPulse: ${appUrl}/dashboard`)
  const text = textLines.join('\n')

  // --- HTML ---
  const section = (title: string, body: string) =>
    body
      ? `<h3 style="margin:20px 0 8px;font:600 12px/1.4 system-ui,sans-serif;text-transform:uppercase;letter-spacing:.04em;color:#64748b">${title}</h3>${body}`
      : ''

  const alertsHtml = alerts
    .map(
      (a) =>
        `<div style="margin:6px 0;font:14px/1.5 system-ui,sans-serif;color:#0f172a"><span style="display:inline-block;width:8px;height:8px;border-radius:9999px;background:${dotColor[a.severity]};margin-right:8px"></span>${escapeHtml(a.message)}</div>`
    )
    .join('')

  const changesHtml = changes
    .map((c) => {
      const color = c.sentiment === 'good' ? '#16a34a' : c.sentiment === 'bad' ? '#dc2626' : '#64748b'
      return `<div style="margin:6px 0;font:14px/1.5 system-ui,sans-serif;color:#0f172a">${escapeHtml(c.label)} <span style="color:${color};font-weight:600">${formatPct(c.pctChange)}</span></div>`
    })
    .join('')

  const insightsHtml = insights
    .map(
      (i) =>
        `<div style="margin:6px 0;font:14px/1.5 system-ui,sans-serif;color:#334155">${escapeHtml(i.summary)}</div>`
    )
    .join('')

  const html = `<div style="max-width:560px;margin:0 auto;padding:24px">
  <div style="font:700 18px/1.3 system-ui,sans-serif;color:#0f172a">BusinessPulse</div>
  <div style="margin-top:4px;font:14px/1.5 system-ui,sans-serif;color:#64748b">${escapeHtml(orgName)}</div>
  <h2 style="margin:16px 0 4px;font:700 20px/1.3 system-ui,sans-serif;color:#0f172a">${itemCount === 0 ? 'All quiet' : `${itemCount} ${noun} changed`}</h2>
  ${intro ? `<p style="margin:8px 0;font:14px/1.6 system-ui,sans-serif;color:#334155">${escapeHtml(intro)}</p>` : ''}
  ${section('Alerts', alertsHtml)}
  ${section('What moved', changesHtml)}
  ${section('Why', insightsHtml)}
  <a href="${appUrl}/dashboard" style="display:inline-block;margin-top:20px;background:#2563eb;color:#fff;text-decoration:none;font:600 14px system-ui,sans-serif;padding:10px 16px;border-radius:8px">Open your dashboard</a>
</div>`

  return { subject, html, text, itemCount }
}
