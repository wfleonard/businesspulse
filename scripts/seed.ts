/**
 * Provision the first user + organization for the single-user MVP.
 *
 * Usage:
 *   BP_SEED_EMAIL=you@example.com BP_SEED_PASSWORD='a-strong-passphrase' \
 *   BP_SEED_ORG='Acme Co' npm run seed
 *
 * Idempotent-ish: refuses to run if the email already exists.
 */
import 'dotenv/config'
import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })

import crypto from 'crypto'
import { hash } from '@node-rs/argon2'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { user, account, organization, membership } from '@/lib/db/schema'

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

async function main() {
  const email = process.env.BP_SEED_EMAIL
  const password = process.env.BP_SEED_PASSWORD
  const orgName = process.env.BP_SEED_ORG || 'My Business'

  if (!email || !password) {
    throw new Error('Set BP_SEED_EMAIL and BP_SEED_PASSWORD')
  }
  if (password.length < 12) {
    throw new Error('BP_SEED_PASSWORD must be at least 12 characters')
  }

  const existing = await db.select().from(user).where(eq(user.email, email))
  if (existing.length > 0) {
    console.log(`User ${email} already exists — nothing to do.`)
    return
  }

  const userId = crypto.randomUUID()
  const passwordHash = await hash(password) // Argon2id (default)
  const now = new Date()

  await db.insert(user).values({
    id: userId,
    name: email.split('@')[0],
    email,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  })

  // better-auth credential account shape: providerId 'credential', accountId = userId.
  await db.insert(account).values({
    id: crypto.randomUUID(),
    accountId: userId,
    providerId: 'credential',
    userId,
    password: passwordHash,
    createdAt: now,
    updatedAt: now,
  })

  const [org] = await db
    .insert(organization)
    .values({ name: orgName, slug: `${slugify(orgName)}-${userId.slice(0, 6)}` })
    .returning()

  await db.insert(membership).values({ orgId: org.id, userId, role: 'owner' })

  console.log(`Seeded user ${email} and org "${orgName}" (${org.id}).`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
