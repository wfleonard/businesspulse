import { db } from '@/lib/db'
import { auditLog } from '@/lib/db/schema'

export type AuditEntry = {
  orgId?: string | null
  userId?: string | null
  action: string
  target?: string | null
  metadata?: Record<string, unknown>
  ipAddress?: string | null
}

/**
 * Record a security-relevant event. Never store raw business values or secrets
 * here — references and small metadata only. Best-effort: a logging failure
 * must not break the underlying action.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await db.insert(auditLog).values({
      orgId: entry.orgId ?? null,
      userId: entry.userId ?? null,
      action: entry.action,
      target: entry.target ?? null,
      metadata: entry.metadata ?? {},
      ipAddress: entry.ipAddress ?? null,
    })
  } catch (err) {
    console.error('recordAudit failed', { action: entry.action, err })
  }
}
