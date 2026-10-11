'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import {
  dismissDomains,
  getBacklogEntry,
  getPanel,
  publishBacklogPanel,
  saveBacklogDraft,
  savePanelEdit,
  setPanelActive,
  StalePanelError,
  updateBacklogEntry,
} from '@/lib/aeo/panel-admin'
import { applyPanelChanges, cleanDomains, validatePanelContent, type PanelContent } from '@/lib/aeo/panel-content'
import { draftPanel, PanelDraftError } from '@/lib/aeo/panel-draft'
import { recordAudit } from '@/lib/audit'
import { requireSession } from '@/lib/session'

/**
 * Admin actions for panels and the panel backlog. Each re-checks the session
 * itself: a server action is a public endpoint.
 */

export type PanelFormState = {
  message?: string
  error?: string
  problems?: string[]
}

const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)

function strings(formData: FormData, name: string): string[] {
  return formData.getAll(name).filter((v): v is string => typeof v === 'string')
}

/** Apply the chosen "learn from runs" suggestions as one new version. */
export async function applyPanelSuggestions(_previous: PanelFormState, formData: FormData): Promise<PanelFormState> {
  const { user } = await requireSession()
  const parsed = z
    .object({ slug: slugSchema, version: z.coerce.number().int().positive(), note: z.string().max(500) })
    .safeParse({ slug: formData.get('slug'), version: formData.get('version'), note: formData.get('note') ?? '' })
  if (!parsed.success) return { error: 'Invalid request.' }
  const { slug, version, note } = parsed.data

  const panel = await getPanel(slug)
  if (!panel) return { error: 'That panel no longer exists.' }

  const choices = { directory: [] as string[], reference: [] as string[], dismiss: [] as string[] }
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith('domain:') || typeof value !== 'string') continue
    if (value === 'directory' || value === 'reference' || value === 'dismiss') choices[value].push(key.slice(7))
  }
  const removeQuestions = strings(formData, 'removeQ')

  const content = applyPanelChanges(panel, {
    addDirectory: choices.directory,
    addReference: choices.reference,
    removeQuestions,
  })
  const changesContent = choices.directory.length + choices.reference.length + removeQuestions.length > 0
  if (!changesContent && choices.dismiss.length === 0) return { error: 'Nothing was selected.' }

  if (changesContent) {
    const problems = validatePanelContent(content)
    if (problems.length > 0) return { error: 'These changes would leave the panel unusable:', problems }
  }

  const dismissed = cleanDomains(choices.dismiss)
  await dismissDomains(slug, dismissed)

  let newVersion: number | null = null
  if (changesContent) {
    try {
      newVersion = await savePanelEdit({
        slug,
        expectedVersion: version,
        content,
        note: note.trim() || 'Suggestions from runs',
        userId: user.id,
      })
    } catch (err) {
      if (err instanceof StalePanelError) return { error: err.message }
      throw err
    }
  }

  await recordAudit({
    userId: user.id,
    action: 'aeo.panel_suggestions',
    target: slug,
    metadata: {
      version: newVersion,
      addDirectory: choices.directory,
      addReference: choices.reference,
      removedQuestions: removeQuestions.length,
      dismissed,
    },
  })
  revalidatePath('/dashboard/panels')
  revalidatePath(`/dashboard/panels/${slug}`)

  const parts: string[] = []
  if (newVersion) parts.push(`Saved as version ${newVersion}.`)
  if (dismissed.length) parts.push(`${dismissed.length} domain${dismissed.length === 1 ? '' : 's'} set aside.`)
  return { message: parts.join(' ') || 'No change.' }
}

/** Rename a live panel. The name is panel content, so this saves a new version. */
export async function renamePanel(_previous: PanelFormState, formData: FormData): Promise<PanelFormState> {
  const { user } = await requireSession()
  const parsed = z
    .object({ slug: slugSchema, version: z.coerce.number().int().positive(), name: z.string().trim().min(1).max(100) })
    .safeParse({ slug: formData.get('slug'), version: formData.get('version'), name: formData.get('name') })
  if (!parsed.success) return { error: 'The panel needs a name.' }
  const { slug, version, name } = parsed.data

  const panel = await getPanel(slug)
  if (!panel) return { error: 'That panel no longer exists.' }
  if (panel.name === name) return { error: 'That is already its name.' }

  let newVersion: number | null
  try {
    newVersion = await savePanelEdit({
      slug,
      expectedVersion: version,
      content: { name, questions: panel.questions, directoryDomains: panel.directoryDomains, referenceDomains: panel.referenceDomains },
      note: `Renamed from "${panel.name}"`,
      userId: user.id,
    })
  } catch (err) {
    if (err instanceof StalePanelError) return { error: err.message }
    throw err
  }

  await recordAudit({ userId: user.id, action: 'aeo.panel_renamed', target: slug, metadata: { from: panel.name, to: name, version: newVersion } })
  revalidatePath('/dashboard/panels')
  revalidatePath(`/dashboard/panels/${slug}`)
  return { message: `Renamed. Saved as version ${newVersion}.` }
}

export async function togglePanelActive(formData: FormData): Promise<void> {
  const { user } = await requireSession()
  const parsed = z
    .object({ slug: slugSchema, active: z.enum(['true', 'false']) })
    .safeParse(Object.fromEntries(formData))
  if (!parsed.success) throw new Error('Invalid request')
  const isActive = parsed.data.active === 'true'
  if (await setPanelActive(parsed.data.slug, isActive)) {
    await recordAudit({ userId: user.id, action: 'aeo.panel_active', target: parsed.data.slug, metadata: { isActive } })
  }
  revalidatePath('/dashboard/panels')
  revalidatePath(`/dashboard/panels/${parsed.data.slug}`)
}

/** Ask Claude for a draft of a backlog panel. Replaces any earlier draft. */
export async function draftBacklogPanel(_previous: PanelFormState, formData: FormData): Promise<PanelFormState> {
  const { user } = await requireSession()
  const parsed = z
    .object({ slug: slugSchema, guidance: z.string().max(2000) })
    .safeParse({ slug: formData.get('slug'), guidance: formData.get('guidance') ?? '' })
  if (!parsed.success) return { error: 'Invalid request.' }

  const entry = await getBacklogEntry(parsed.data.slug)
  if (!entry) return { error: 'That backlog entry no longer exists.' }
  if (entry.live) return { error: 'This panel is already live.' }

  try {
    const draft = await draftPanel({ ...entry, guidance: parsed.data.guidance })
    await saveBacklogDraft(entry.slug, parsed.data.guidance, draft)
    await recordAudit({
      userId: user.id,
      action: 'aeo.panel_drafted',
      target: entry.slug,
      metadata: { model: draft.model, costUsd: draft.costUsd, questions: draft.questions.length },
    })
  } catch (err) {
    if (err instanceof PanelDraftError) {
      console.error('panel draft failed', { slug: entry.slug, message: err.message, costUsd: err.costUsd })
      return { error: `The draft failed: ${err.message}.` }
    }
    console.error('panel draft failed', { slug: entry.slug, err })
    return { error: 'The draft failed. Check the server log and try again.' }
  }

  revalidatePath('/dashboard/panels')
  revalidatePath(`/dashboard/panels/backlog/${entry.slug}`)
  return { message: 'Draft ready. Review it below.' }
}

/** Publish the checked parts of a draft as a live panel. */
export async function publishBacklogDraft(_previous: PanelFormState, formData: FormData): Promise<PanelFormState> {
  const { user } = await requireSession()
  const parsed = z
    .object({ slug: slugSchema, name: z.string().trim().min(1).max(100) })
    .safeParse({ slug: formData.get('slug'), name: formData.get('name') })
  if (!parsed.success) return { error: 'The panel needs a name.' }

  const entry = await getBacklogEntry(parsed.data.slug)
  if (!entry?.draft) return { error: 'There is no draft to publish.' }
  if (entry.live) return { error: 'This panel is already live.' }

  const keepQ = new Set(strings(formData, 'keepQ').map(Number))
  const keepDir = new Set(strings(formData, 'keepDir'))
  const keepRef = new Set(strings(formData, 'keepRef'))
  const content: PanelContent = {
    name: parsed.data.name,
    questions: entry.draft.questions.filter((_, i) => keepQ.has(i)),
    directoryDomains: entry.draft.directoryDomains.filter((d) => keepDir.has(d)),
    referenceDomains: entry.draft.referenceDomains.filter((d) => keepRef.has(d)),
  }
  const problems = validatePanelContent(content)
  if (problems.length > 0) return { error: 'Fix these before publishing:', problems }

  await publishBacklogPanel(entry.slug, content, user.id)
  await recordAudit({
    userId: user.id,
    action: 'aeo.panel_published',
    target: entry.slug,
    metadata: { questions: content.questions.length },
  })
  revalidatePath('/dashboard/panels')
  redirect(`/dashboard/panels/${entry.slug}`)
}

export async function setBacklogStatus(formData: FormData): Promise<void> {
  const { user } = await requireSession()
  const parsed = z
    .object({ slug: slugSchema, status: z.enum(['planned', 'skipped']) })
    .safeParse(Object.fromEntries(formData))
  if (!parsed.success) throw new Error('Invalid request')
  // Restoring a skipped entry brings back its draft, if it had one.
  const entry = parsed.data.status === 'planned' ? await getBacklogEntry(parsed.data.slug) : null
  await updateBacklogEntry(parsed.data.slug, { status: entry?.draft ? 'drafted' : parsed.data.status })
  await recordAudit({ userId: user.id, action: 'aeo.backlog_status', target: parsed.data.slug, metadata: parsed.data })
  revalidatePath('/dashboard/panels')
  revalidatePath(`/dashboard/panels/backlog/${parsed.data.slug}`)
}
