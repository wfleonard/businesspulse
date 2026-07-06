import 'server-only'
import { and, eq, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { alert, alertRule, insight, organization, membership, user } from '@/lib/db/schema'
import type { AlertCondition, AlertSeverity, RuleLite } from './rules'

/* ------------------------------ Alert rules ------------------------------ */

export type RuleRow = RuleLite & { channel: string; isActive: boolean }

export async function listRules(orgId: string, activeOnly = false): Promise<RuleRow[]> {
  const rows = await db
    .select()
    .from(alertRule)
    .where(eq(alertRule.orgId, orgId))
    .orderBy(desc(alertRule.createdAt))
  return rows
    .filter((r) => (activeOnly ? r.isActive : true))
    .map((r) => ({
      id: r.id,
      metricKey: r.metricKey,
      condition: r.condition as AlertCondition,
      threshold: r.threshold != null ? Number(r.threshold) : null,
      channel: r.channel,
      isActive: r.isActive,
    }))
}

export async function createRule(
  orgId: string,
  input: { metricKey: string; condition: AlertCondition; threshold: number | null }
): Promise<void> {
  await db.insert(alertRule).values({
    orgId,
    metricKey: input.metricKey,
    condition: input.condition,
    threshold: input.threshold != null ? String(input.threshold) : null,
  })
}

export async function deleteRule(orgId: string, id: string): Promise<void> {
  await db.delete(alertRule).where(and(eq(alertRule.orgId, orgId), eq(alertRule.id, id)))
}

/* --------------------------------- Alerts -------------------------------- */

export async function hasOpenAlertForRule(orgId: string, ruleId: string): Promise<boolean> {
  const rows = await db
    .select({ id: alert.id })
    .from(alert)
    .where(and(eq(alert.orgId, orgId), eq(alert.ruleId, ruleId), eq(alert.status, 'open')))
    .limit(1)
  return rows.length > 0
}

export async function createAlert(
  orgId: string,
  input: { ruleId: string; metricKey: string; severity: AlertSeverity; message: string }
): Promise<void> {
  await db.insert(alert).values({
    orgId,
    ruleId: input.ruleId,
    metricKey: input.metricKey,
    severity: input.severity,
    message: input.message,
  })
}

export type AlertRow = {
  id: string
  metricKey: string
  severity: AlertSeverity
  status: 'open' | 'acknowledged' | 'resolved'
  message: string
  createdAt: Date
}

export async function listAlerts(orgId: string, openOnly = false): Promise<AlertRow[]> {
  const rows = await db
    .select()
    .from(alert)
    .where(eq(alert.orgId, orgId))
    .orderBy(desc(alert.createdAt))
    .limit(100)
  return rows
    .filter((r) => (openOnly ? r.status === 'open' : true))
    .map((r) => ({
      id: r.id,
      metricKey: r.metricKey,
      severity: r.severity,
      status: r.status,
      message: r.message,
      createdAt: r.createdAt,
    }))
}

export async function countOpenAlerts(orgId: string): Promise<number> {
  const rows = await db
    .select({ id: alert.id })
    .from(alert)
    .where(and(eq(alert.orgId, orgId), eq(alert.status, 'open')))
  return rows.length
}

export async function setAlertStatus(
  orgId: string,
  id: string,
  status: 'open' | 'acknowledged' | 'resolved'
): Promise<void> {
  await db.update(alert).set({ status }).where(and(eq(alert.orgId, orgId), eq(alert.id, id)))
}

/* -------------------------------- Insights ------------------------------- */

export async function createInsight(
  orgId: string,
  input: {
    metricKey: string
    periodStart: Date
    periodEnd: Date
    delta: number | null
    summary: string
  }
): Promise<void> {
  await db.insert(insight).values({
    orgId,
    metricKey: input.metricKey,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    delta: input.delta != null ? String(input.delta) : null,
    summary: input.summary,
  })
}

export type InsightRow = { metricKey: string; summary: string; createdAt: Date }

export async function listRecentInsights(orgId: string, limit = 10): Promise<InsightRow[]> {
  const rows = await db
    .select({ metricKey: insight.metricKey, summary: insight.summary, createdAt: insight.createdAt })
    .from(insight)
    .where(eq(insight.orgId, orgId))
    .orderBy(desc(insight.createdAt))
    .limit(limit)
  return rows
}

/* ----------------------------- Org enumeration --------------------------- */

/** All orgs with their owner's email, for the watch cron. */
export async function listOrgsForWatch(): Promise<
  { orgId: string; orgName: string; ownerEmail: string }[]
> {
  const rows = await db
    .select({ orgId: organization.id, orgName: organization.name, ownerEmail: user.email })
    .from(organization)
    .innerJoin(membership, and(eq(membership.orgId, organization.id), eq(membership.role, 'owner')))
    .innerJoin(user, eq(user.id, membership.userId))
  return rows
}
