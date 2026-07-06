import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { membership, organization } from '@/lib/db/schema'
import { requireSession } from '@/lib/session'

export type CurrentOrg = {
  userId: string
  orgId: string
  orgName: string
  role: string
}

/**
 * Resolve the current user's organization. In the single-user MVP each user has
 * exactly one org (their owner membership). Redirects to /login if there is no
 * session; throws if the user somehow has no org (a seed/data bug).
 */
export async function requireOrg(): Promise<CurrentOrg> {
  const { user } = await requireSession()

  const rows = await db
    .select({
      orgId: organization.id,
      orgName: organization.name,
      role: membership.role,
    })
    .from(membership)
    .innerJoin(organization, eq(membership.orgId, organization.id))
    .where(eq(membership.userId, user.id))
    .limit(1)

  const org = rows[0]
  if (!org) {
    throw new Error(`User ${user.id} has no organization membership`)
  }

  return { userId: user.id, orgId: org.orgId, orgName: org.orgName, role: org.role }
}
