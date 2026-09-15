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
 */
import 'dotenv/config'
import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })

import { eq } from 'drizzle-orm'
import { CANNED_PANELS } from '@/lib/aeo/panels'
import { closeDb, db } from '@/lib/db'
import { aeoPanel } from '@/lib/db/schema'

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
      await db.insert(aeoPanel).values({ slug: definition.slug, ...content })
      console.log(`${definition.slug}: created, version 1, ${definition.questions.length} questions`)
      continue
    }

    const changed = contentOf(existing) !== contentOf(content)
    if (!changed && existing.isActive) {
      console.log(`${definition.slug}: unchanged, version ${existing.version}`)
      continue
    }

    const version = changed ? existing.version + 1 : existing.version
    await db
      .update(aeoPanel)
      .set({ ...content, version, isActive: true, updatedAt: new Date() })
      .where(eq(aeoPanel.id, existing.id))
    console.log(
      `${definition.slug}: ${changed ? `updated to version ${version}` : 'reactivated'}, ${definition.questions.length} questions`
    )
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => closeDb())
