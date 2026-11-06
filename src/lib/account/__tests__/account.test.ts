/** @jest-environment node */
import { readdirSync, readFileSync, statSync } from 'fs'
import path from 'path'

jest.mock('server-only', () => ({}))
jest.mock('@/lib/db', () => {
  const { drizzle } = jest.requireActual('drizzle-orm/node-postgres')
  return { db: drizzle.mock() }
})

// Imported after the mocks.
import { linkSnapshotsQuery, snapshotReportsQuery } from '../business'
import { businessProfileSchema, CUSTOM_INDUSTRY } from '../schema'

const valid = {
  name: 'Acme Roofing',
  website: 'https://www.AcmeRoofing.com/about',
  otherDomains: 'acmeroofing.com, acme-gutters.com\nacme-gutters.com',
  industry: 'residential-roofing',
  customIndustry: 'ignored unless Something else',
  service: 'roof replacement',
  city: 'Red Bank',
  state: 'nj',
}

describe('businessProfileSchema', () => {
  it('normalizes the websites and drops the main site from the others', () => {
    const parsed = businessProfileSchema.parse(valid)
    expect(parsed).toMatchObject({
      website: 'acmeroofing.com',
      otherDomains: ['acme-gutters.com'],
      state: 'NJ',
      customIndustry: '',
    })
  })

  it('asks what the business does when no industry fits', () => {
    const result = businessProfileSchema.safeParse({ ...valid, industry: CUSTOM_INDUSTRY, customIndustry: '' })
    expect(result.success).toBe(false)
    expect(result.error!.issues[0].path).toEqual(['customIndustry'])

    const ok = businessProfileSchema.parse({ ...valid, industry: CUSTOM_INDUSTRY, customIndustry: 'Kitchen equipment repair' })
    expect(ok.customIndustry).toBe('Kitchen equipment repair')
  })

  it('rejects a missing website, industry, or state', () => {
    const result = businessProfileSchema.safeParse({ ...valid, website: 'not a site', industry: '', state: 'ZZ' })
    expect(result.success).toBe(false)
    expect(result.error!.issues.map((i) => i.path[0])).toEqual(
      expect.arrayContaining(['website', 'industry', 'state'])
    )
  })
})

describe('silo: queries are scoped to one business', () => {
  it('links only verified, unerased public-form snapshots from the account email', () => {
    const { sql, params } = linkSnapshotsQuery('b-1', ' Pat@Acme.com ').toSQL()
    expect(sql).toContain('"business_id" is null')
    expect(sql).toContain('"source" = $')
    expect(sql).toContain('"verified_at" is not null')
    expect(sql).toContain('"anonymized_at" is null')
    expect(sql).toContain('lower("aeo_request"."email") = $')
    expect(params).toEqual(expect.arrayContaining(['b-1', 'form', 'pat@acme.com']))
  })

  it('lists reports only through the business id', () => {
    const { sql, params } = snapshotReportsQuery('b-1').toSQL()
    expect(sql).toMatch(/where "aeo_request"."business_id" = \$1/)
    expect(params).toEqual(['b-1'])
  })
})

/** Static checks over the customer area, like the dashboard role test. */
describe('silo: the customer area', () => {
  const root = path.join(__dirname, '../../../app/account')
  const files: string[] = []
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name)
      if (statSync(full).isDirectory()) walk(full)
      else if (/\.(ts|tsx)$/.test(name)) files.push(full)
    }
  }
  walk(root)

  it('has pages and actions to check', () => {
    expect(files.some((f) => f.endsWith('actions.ts'))).toBe(true)
    expect(files.filter((f) => f.endsWith('page.tsx')).length).toBeGreaterThanOrEqual(2)
  })

  it.each(files.map((f) => [path.relative(root, f), f]))('%s checks the session and never queries the database itself', (_, file) => {
    const source = readFileSync(file, 'utf8')
    expect(source).toContain('requireSession()')
    expect(source).not.toMatch(/from '@\/lib\/db'/)
    expect(source).not.toMatch(/from '@\/lib\/db\/schema'/)
  })

  it('never takes an owner or record id from the form or the URL', () => {
    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      expect(source).not.toMatch(/formData\.get\(['"](userId|businessId|id|runId|requestId)['"]\)/)
      expect(source).not.toMatch(/params\.(userId|businessId|id|runId|requestId)\b/)
    }
  })

  it('loads account data only by the session user', () => {
    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      for (const call of source.matchAll(/\b(getBusiness|listReports|saveBusiness)\(([^,)]*)/g)) {
        expect(call[2].trim()).toBe('user.id')
      }
    }
  })
})
