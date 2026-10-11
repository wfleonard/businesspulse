import { escapeHtml } from './emails'

/**
 * Merge fields and the light Markdown that follow-up emails are written in,
 * ported from the primosmaternos.com outreach mailer.
 *
 * Merge fields are @name, lowercase. An @ right after a letter, digit, dot,
 * or @ belongs to an email address and is left alone, so bill@example.com in
 * a signature is never treated as a field.
 *
 * Markdown: blank-line paragraphs, "- " and "1. " lists, "> " quotes,
 * **bold**, *italic*, [text](https://link). Links may also be a merge field,
 * as in [your report](@report_url).
 */

export type Fields = Record<string, string>

const FIELD_RE = /(?<![\w.@])@([a-z][a-z0-9_]*)/g

/** The fields a lead can fill, with what each one is, for the template editor. */
export const MERGE_FIELDS: { name: string; description: string }[] = [
  { name: 'business', description: 'Business name from the request form' },
  { name: 'domain', description: 'Website, like example.com' },
  { name: 'service', description: 'Main service, in their words' },
  { name: 'city', description: 'City' },
  { name: 'state', description: 'State name' },
  { name: 'industry', description: 'Panel name, like "Pest control" (blank for generated panels)' },
  { name: 'score', description: 'Cited count, like "3 of 20"' },
  { name: 'report_url', description: 'Link to their report' },
  { name: 'book_url', description: 'Book-a-call link (records the click)' },
]

const KNOWN_FIELDS = new Set(MERGE_FIELDS.map((f) => f.name))

/** Every @field a text uses, in order of first appearance. */
export function fieldsUsed(text: string): string[] {
  return [...new Set([...text.matchAll(FIELD_RE)].map((m) => m[1]))]
}

/** Fields a template uses that no lead can ever fill: almost always a typo. */
export function unknownFields(text: string): string[] {
  return fieldsUsed(text).filter((f) => !KNOWN_FIELDS.has(f))
}

/** Fills @fields. Blank or absent ones are left in place and reported. */
export function merge(text: string, fields: Fields): { text: string; missing: string[] } {
  const missing = new Set<string>()
  const out = text.replace(FIELD_RE, (match, key: string) => {
    const value = fields[key]?.trim()
    if (!value) {
      missing.add(key)
      return match
    }
    return value
  })
  return { text: out, missing: [...missing] }
}

const LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g

function inlineHtml(s: string): string {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
    .replace(LINK_RE, '<a href="$2" style="color:#2563eb">$1</a>')
}

function inlineText(s: string): string {
  return s
    .replace(LINK_RE, '$1 ($2)')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
}

const blocks = (md: string) =>
  md
    .replace(/\r\n/g, '\n')
    .trim()
    .split(/\n{2,}/)
    .map((b) => b.split('\n'))

const P = 'style="margin:0 0 14px"'

function bodyHtml(md: string): string {
  return blocks(md)
    .map((lines) => {
      if (lines.every((l) => /^[-*] /.test(l))) {
        return `<ul ${P}>${lines.map((l) => `<li>${inlineHtml(l.slice(2))}</li>`).join('')}</ul>`
      }
      if (lines.every((l) => /^\d+\. /.test(l))) {
        return `<ol ${P}>${lines.map((l) => `<li>${inlineHtml(l.replace(/^\d+\. /, ''))}</li>`).join('')}</ol>`
      }
      if (lines.every((l) => l.startsWith('>'))) {
        const inner = lines.map((l) => inlineHtml(l.replace(/^>\s?/, ''))).join('<br>')
        return `<blockquote style="margin:0 0 14px;padding-left:12px;border-left:3px solid #e2e8f0;color:#475569">${inner}</blockquote>`
      }
      return `<p ${P}>${lines.map(inlineHtml).join('<br>')}</p>`
    })
    .join('\n')
}

export type Footer = { unsubscribeUrl: string; postalAddress?: string }

const FOOTER_REASON = 'You asked us to contact you about your results when you ran your AI visibility snapshot.'

/** The full email: the written body plus the unsubscribe footer every follow-up carries. */
export function renderMail(md: string, footer: Footer): { html: string; text: string } {
  const footerHtml = [
    `${FOOTER_REASON} <a href="${escapeHtml(footer.unsubscribeUrl)}" style="color:#64748b">Unsubscribe</a>`,
    ...(footer.postalAddress ? [escapeHtml(footer.postalAddress)] : []),
  ].join('<br>')
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#ffffff"><div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#0f172a;max-width:620px;padding:16px">${bodyHtml(md)}<p style="margin:28px 0 0;padding-top:12px;border-top:1px solid #e2e8f0;font-size:12px;line-height:1.5;color:#64748b">${footerHtml}</p></div></body></html>`

  const text = [
    blocks(md)
      .map((lines) => lines.map((l) => inlineText(l.replace(/^>\s?/, ''))).join('\n'))
      .join('\n\n'),
    '',
    '--',
    FOOTER_REASON,
    `Unsubscribe: ${footer.unsubscribeUrl}`,
    ...(footer.postalAddress ? [footer.postalAddress] : []),
  ].join('\n')

  return { html, text }
}
