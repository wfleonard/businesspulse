/**
 * CSV for spreadsheet export.
 *
 * Text that starts with =, +, -, @, tab, or carriage return is prefixed with an
 * apostrophe, so a business name typed into the public form can't run as a
 * formula when the export is opened in Excel or Sheets. Numbers are left alone.
 */

const FORMULA_START = /^[=+\-@\t\r]/

export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)

  let text = value instanceof Date ? value.toISOString() : String(value)
  if (FORMULA_START.test(text)) text = `'${text}`
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n'
}
