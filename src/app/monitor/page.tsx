import { permanentRedirect } from 'next/navigation'

/**
 * BusinessPulse Monitor ($49 a month) was replaced by Pulse before it opened
 * (docs/pulse-plan.md). Old links, including waitlist links in sent reports,
 * land on the Pulse page.
 */
export default function MonitorPage() {
  permanentRedirect('/pulse')
}
