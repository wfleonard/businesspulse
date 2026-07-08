import { z } from 'zod'
import { getPath, getRows } from './path'
import { authConfigSchema, mappingSchema } from './config'

/**
 * Endpoint preview: fetch an endpoint and describe the response shape so the
 * user can build mappings without needing Postman first. Mappings are optional
 * here (you're still discovering the fields).
 */

export const previewConfigSchema = z.object({
  baseUrl: z.string().url(),
  auth: authConfigSchema.default({ type: 'none' }),
  endpoints: z
    .array(
      z.object({
        path: z.string().min(1),
        method: z.literal('GET').default('GET'),
        query: z.record(z.string(), z.string()).optional(),
        rowsPath: z.string().optional(),
        filter: z
          .array(z.object({ path: z.string().min(1), equals: z.string() }))
          .optional(),
        mappings: z.array(mappingSchema).optional().default([]),
      })
    )
    .min(1),
})
export type PreviewConfig = z.infer<typeof previewConfigSchema>

export type FieldInfo = { path: string; type: string; sample: string }
export type ResponseShape = {
  rowCount: number
  rootKeys: string[] // when no rows found — helps locate rowsPath
  fields: FieldInfo[]
}

function sampleStr(v: unknown): string {
  if (v === null || v === undefined) return String(v)
  if (Array.isArray(v)) return `[${v.length} items]`
  if (typeof v === 'object') return '{…}'
  const s = String(v)
  return s.length > 48 ? `${s.slice(0, 48)}…` : s
}

function inferType(v: unknown): string {
  if (v === null) return 'null'
  if (typeof v === 'number') return 'number'
  if (typeof v === 'boolean') return 'boolean'
  if (Array.isArray(v)) return `array[${v.length}]`
  if (typeof v === 'object') return 'object'
  if (typeof v === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(v) && !Number.isNaN(Date.parse(v))) return 'date'
    if (v.trim() !== '' && !Number.isNaN(Number(v))) return 'number (string)'
    return 'string'
  }
  return typeof v
}

/** Flatten a row into dotted field paths (recursing one+ levels into objects). */
export function fieldsFromRow(row: unknown, prefix = ''): FieldInfo[] {
  if (row == null || typeof row !== 'object' || Array.isArray(row)) {
    return [{ path: prefix || '(value)', type: inferType(row), sample: sampleStr(row) }]
  }
  const out: FieldInfo[] = []
  for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out.push(...fieldsFromRow(v, path))
    } else {
      out.push({ path, type: inferType(v), sample: sampleStr(v) })
    }
  }
  return out
}

/** Describe the response: the fields of the first row, or root keys if no rows. */
export function describeResponse(response: unknown, rowsPath?: string): ResponseShape {
  const rows = getRows(response, rowsPath)
  if (rows.length === 0 || (rows.length === 1 && rows[0] === response && !Array.isArray(response))) {
    // Either genuinely empty, or getRows wrapped a non-array body: show root keys
    // so the user can spot the array to point rowsPath at.
    const target = rowsPath ? getPath(response, rowsPath) : response
    const rootKeys =
      target && typeof target === 'object' && !Array.isArray(target)
        ? Object.keys(target as Record<string, unknown>)
        : []
    if (Array.isArray(target) && target.length > 0) {
      return { rowCount: target.length, rootKeys: [], fields: fieldsFromRow(target[0]) }
    }
    return { rowCount: 0, rootKeys, fields: rootKeys.length ? [] : fieldsFromRow(rows[0]) }
  }
  return { rowCount: rows.length, rootKeys: [], fields: fieldsFromRow(rows[0]) }
}
