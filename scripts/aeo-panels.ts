/**
 * Create or update the canned AEO question panels from src/lib/aeo/panels.
 *
 *   npm run aeo:panels
 *
 * Production (from ~/businesspulse on the server):
 *   docker compose -f docker-compose.prod.yml --profile tools run --rm migrate npm run aeo:panels
 *
 * A panel whose name, questions, or domain lists changed gets version + 1, so
 * each run records which version produced its report. Unchanged panels are
 * left alone, so running this twice is harmless.
 *
 * Panels edited or created in the dashboard (edited_at set) belong to the
 * database now and are never overwritten from code.
 *
 * Also adds any missing entries from the panel backlog (panels/backlog.ts).
 * Existing backlog entries are left as the dashboard has them.
 */
import 'dotenv/config'
import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })

import { eq } from 'drizzle-orm'
import { recordCurrentVersion } from '@/lib/aeo/panel-admin'
import { CANNED_PANELS } from '@/lib/aeo/panels'
import { PANEL_BACKLOG } from '@/lib/aeo/panels/backlog'
import { closeDb, db } from '@/lib/db'
import { aeoPanel, aeoPanelBacklog } from '@/lib/db/schema'

function contentOf(panel: {
  name: string
  questions: unknown
  directoryDomains: unknown
  referenceDomains: unknown
}): string {
  return JSON.stringify({
    name: panel.name,
    questions: panel.questions,
    directoryDomains: panel.directoryDomains,
    referenceDomains: panel.referenceDomains,
  })
}

async function main() {
  for (const definition of CANNED_PANELS) {
    const content = {
      name: definition.name,
      questions: definition.questions,
      directoryDomains: definition.directoryDomains,
      referenceDomains: definition.referenceDomains,
    }

    const [existing] = await db.select().from(aeoPanel).where(eq(aeoPanel.slug, definition.slug)).limit(1)

    if (!existing) {
      const [created] = await db.insert(aeoPanel).values({ slug: definition.slug, ...content }).returning()
      await recordCurrentVersion(db, created, 'From code')
      console.log(`${definition.slug}: created, version 1, ${definition.questions.length} questions`)
      continue
    }

    if (existing.editedAt) {
      console.log(`${definition.slug}: edited in the dashboard, left alone (version ${existing.version})`)
      continue
    }

    const changed = contentOf(existing) !== contentOf(content)
    if (!changed && existing.isActive) {
      console.log(`${definition.slug}: unchanged, version ${existing.version}`)
      continue
    }

    const version = changed ? existing.version + 1 : existing.version
    if (changed) await recordCurrentVersion(db, existing, 'From code')
    const [updated] = await db
      .update(aeoPanel)
      .set({ ...content, version, isActive: true, updatedAt: new Date() })
      .where(eq(aeoPanel.id, existing.id))
      .returning()
    if (changed) await recordCurrentVersion(db, updated, 'From code')
    console.log(
      `${definition.slug}: ${changed ? `updated to version ${version}` : 'reactivated'}, ${definition.questions.length} questions`
    )
  }

  const added = await db
    .insert(aeoPanelBacklog)
    .values(PANEL_BACKLOG.map((entry, index) => ({ ...entry, rank: index + 1 })))
    .onConflictDoNothing({ target: aeoPanelBacklog.slug })
    .returning({ slug: aeoPanelBacklog.slug })
  console.log(`backlog: ${added.length} added, ${PANEL_BACKLOG.length - added.length} already there`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => closeDb())
