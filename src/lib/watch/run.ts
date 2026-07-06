import 'server-only'
import { buildOrgSummary } from '@/lib/ai/summary'
import { explainChanges } from '@/lib/ai/watch'
import { evaluateRules, detectMaterialChanges } from './rules'
import { composeDigest } from './digest'
import { sendEmail } from '@/lib/email/provider'
import {
  listRules,
  hasOpenAlertForRule,
  createAlert,
  createInsight,
  listOrgsForWatch,
} from './store'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export type WatchResult = {
  orgId: string
  orgName: string
  newAlerts: number
  changes: number
  insights: number
  emailed: boolean
  emailSkipped?: string
  emailError?: string
}

/**
 * Business Watch for one org: evaluate alert rules → persist new alerts (deduped
 * against open ones) → detect material changes → (AI) explain them → persist
 * insights → compose + send the morning digest.
 */
export async function runWatch(
  orgId: string,
  orgName: string,
  recipientEmail: string
): Promise<WatchResult> {
  const summary = await buildOrgSummary(orgId, orgName)

  // 1. Alert rules → new alerts (dedupe: one open alert per rule at a time).
  const rules = await listRules(orgId, true)
  const triggered = evaluateRules(rules, summary.metrics)
  let newAlerts = 0
  const digestAlerts: { severity: (typeof triggered)[number]['severity']; message: string }[] = []
  for (const t of triggered) {
    if (await hasOpenAlertForRule(orgId, t.ruleId)) continue
    await createAlert(orgId, t)
    newAlerts++
    digestAlerts.push({ severity: t.severity, message: t.message })
  }

  // 2. Material changes → AI explanations → insights.
  const changes = detectMaterialChanges(summary.metrics)
  const explained = await explainChanges(summary, changes)
  const insightItems = explained?.insights ?? []

  const byKey = new Map(summary.metrics.map((m) => [m.key, m]))
  for (const i of insightItems) {
    const m = byKey.get(i.metricKey)
    if (!m) continue
    await createInsight(orgId, {
      metricKey: i.metricKey,
      periodStart: m.periodStart ? new Date(m.periodStart) : new Date(),
      periodEnd: m.periodEnd ? new Date(m.periodEnd) : new Date(),
      delta: m.absoluteChange,
      summary: i.summary,
    })
  }

  // 3. Compose + send the digest (only if there's something to report).
  const digest = composeDigest({
    orgName,
    appUrl: APP_URL,
    alerts: digestAlerts,
    changes,
    insights: insightItems,
    intro: explained?.intro,
  })

  let emailed = false
  let emailSkipped: string | undefined
  let emailError: string | undefined
  if (digest.itemCount > 0) {
    const res = await sendEmail({ to: recipientEmail, subject: digest.subject, html: digest.html, text: digest.text })
    emailed = res.sent
    emailSkipped = res.skipped
    emailError = res.error
  }

  return {
    orgId,
    orgName,
    newAlerts,
    changes: changes.length,
    insights: insightItems.length,
    emailed,
    emailSkipped,
    emailError,
  }
}

/** Run Business Watch for every org (used by the cron trigger). */
export async function runWatchAll(): Promise<WatchResult[]> {
  const orgs = await listOrgsForWatch()
  const out: WatchResult[] = []
  for (const o of orgs) out.push(await runWatch(o.orgId, o.orgName, o.ownerEmail))
  return out
}
