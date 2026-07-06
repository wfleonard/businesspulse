/**
 * Email provider abstraction. Mailtrap Email Sending API by default; the
 * interface lets us swap providers later. Sending is a graceful no-op when
 * unconfigured, so the watch job never fails just because email isn't set up.
 */

export type EmailPayload = {
  to: string
  subject: string
  html: string
  text?: string
}

export type SendResult = { sent: boolean; skipped?: string; error?: string }

export function emailConfigured(): boolean {
  return Boolean(process.env.MAILTRAP_API_TOKEN && process.env.MAILTRAP_SENDER)
}

export async function sendEmail(payload: EmailPayload): Promise<SendResult> {
  if (!emailConfigured()) {
    return { sent: false, skipped: 'email not configured (MAILTRAP_API_TOKEN/MAILTRAP_SENDER)' }
  }
  const token = process.env.MAILTRAP_API_TOKEN as string
  const sender = process.env.MAILTRAP_SENDER as string

  try {
    const res = await fetch('https://send.api.mailtrap.io/api/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: { email: sender, name: 'BusinessPulse' },
        to: [{ email: payload.to }],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      return { sent: false, error: `Mailtrap ${res.status}: ${detail.slice(0, 200)}` }
    }
    return { sent: true }
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : String(err) }
  }
}
