import { marked } from 'marked'

/**
 * Markdown to HTML for Resource Hub articles. Articles are written by us and
 * reviewed before publishing; visitor-supplied text is never rendered here.
 *
 * Kept out of the modules the tests import: marked ships as an ES module only.
 */
export function renderMarkdown(markdown: string): string {
  return marked.parse(markdown, { async: false, gfm: true }) as string
}
