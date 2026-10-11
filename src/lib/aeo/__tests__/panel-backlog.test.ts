/** @jest-environment node */
import { CANNED_PANELS } from '../panels'
import { PANEL_BACKLOG } from '../panels/backlog'

describe('panel backlog', () => {
  it('has 50 entries with unique, URL-safe slugs and full descriptions', () => {
    expect(PANEL_BACKLOG).toHaveLength(50)
    const slugs = PANEL_BACKLOG.map((e) => e.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const entry of PANEL_BACKLOG) {
      expect(entry.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      expect(entry.name.trim()).not.toBe('')
      expect(entry.buyers.trim()).not.toBe('')
      expect(entry.rationale.trim()).not.toBe('')
    }
  })

  it('never repeats a panel that already exists in code', () => {
    const existing = new Set(CANNED_PANELS.map((p) => p.slug))
    for (const entry of PANEL_BACKLOG) expect(existing.has(entry.slug)).toBe(false)
  })
})
