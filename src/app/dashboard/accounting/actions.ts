'use server'

import { revalidatePath } from 'next/cache'
import { requireOrg } from '@/lib/org'
import { recordAudit } from '@/lib/audit'
import { importAccountsCsv, importTransactionsCsv } from '@/lib/ledger/import-run'

export type ImportState = { ok: boolean; message?: string }

async function readCsv(formData: FormData): Promise<string | { error: string }> {
  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) return { error: 'Choose a CSV file.' }
  if (file.size > 10_000_000) return { error: 'File too large (max 10 MB).' }
  return file.text()
}

export async function importAccountsAction(
  _prev: ImportState,
  formData: FormData
): Promise<ImportState> {
  const { orgId, userId } = await requireOrg()
  const text = await readCsv(formData)
  if (typeof text !== 'string') return { ok: false, message: text.error }

  const res = await importAccountsCsv(orgId, text)
  await recordAudit({ orgId, userId, action: 'ledger.import.accounts', metadata: { imported: res.imported } })
  revalidatePath('/dashboard/accounting')

  if (res.imported === 0) {
    const detail = res.errors.slice(0, 3).map((e) => `line ${e.line}: ${e.message}`).join('; ')
    return { ok: false, message: `No accounts imported. ${detail}` }
  }
  const skipped = res.errors.length ? ` ${res.errors.length} row(s) skipped.` : ''
  return { ok: true, message: `Imported ${res.imported} account(s).${skipped}` }
}

export async function importTransactionsAction(
  _prev: ImportState,
  formData: FormData
): Promise<ImportState> {
  const { orgId, userId } = await requireOrg()
  const text = await readCsv(formData)
  if (typeof text !== 'string') return { ok: false, message: text.error }

  const res = await importTransactionsCsv(orgId, text)
  await recordAudit({
    orgId,
    userId,
    action: 'ledger.import.transactions',
    metadata: { imported: res.imported, derived: res.derivedMetrics },
  })
  revalidatePath('/dashboard/accounting')
  revalidatePath('/dashboard/reports')
  revalidatePath('/dashboard')

  if (res.imported === 0) {
    const detail = res.errors.slice(0, 3).map((e) => `line ${e.line}: ${e.message}`).join('; ')
    return { ok: false, message: `No transactions imported. ${detail}` }
  }
  const skipped = res.errors.length ? ` ${res.errors.length} row(s) skipped.` : ''
  return {
    ok: true,
    message: `Imported ${res.imported} transaction(s); refreshed ${res.derivedMetrics} KPI point(s).${skipped}`,
  }
}
