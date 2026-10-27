/** @jest-environment node */
import { readdirSync, readFileSync, statSync } from 'fs'
import path from 'path'

jest.mock('server-only', () => ({}))
jest.mock('next/headers', () => ({ headers: async () => new Headers() }))
jest.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`)
  },
}))
const getSessionMock = jest.fn()
jest.mock('@/lib/auth', () => ({ auth: { api: { getSession: (...args: unknown[]) => getSessionMock(...args) } } }))

// Imported after the mocks.
import { isAdmin, requireAdmin, requireSession } from '../session'

const as = (role: string | null) => (role ? { user: { id: 'u1', role }, session: {} } : null)

describe('role guards', () => {
  it('sends a signed-out visitor to sign in', async () => {
    getSessionMock.mockResolvedValue(as(null))
    await expect(requireAdmin()).rejects.toThrow('redirect:/login')
    await expect(requireSession()).rejects.toThrow('redirect:/login')
  })

  it('sends a customer to their account, never into the dashboard', async () => {
    getSessionMock.mockResolvedValue(as('customer'))
    await expect(requireAdmin()).rejects.toThrow('redirect:/account')
    await expect(requireSession()).resolves.toMatchObject({ user: { role: 'customer' } })
  })

  it('lets an admin through', async () => {
    getSessionMock.mockResolvedValue(as('admin'))
    await expect(requireAdmin()).resolves.toMatchObject({ user: { role: 'admin' } })
  })

  it('treats a missing or unknown role as not an admin', () => {
    expect(isAdmin(null)).toBe(false)
    expect(isAdmin(as('owner') as never)).toBe(false)
    expect(isAdmin({ user: { id: 'u1' }, session: {} } as never)).toBe(false)
  })
})

/** Every file under a directory, recursively. */
function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)
    return statSync(full).isDirectory() ? filesUnder(full) : [full]
  })
}

describe('the dashboard is admin only', () => {
  const dashboard = path.join(process.cwd(), 'src', 'app', 'dashboard')
  const files = filesUnder(dashboard).filter((f) => /\.(ts|tsx)$/.test(f))
  const entryPoints = files.filter((f) => /(page\.tsx|layout\.tsx|route\.ts|actions\.ts)$/.test(f))

  it('never checks only for a signed-in user', () => {
    for (const file of files) expect([file, readFileSync(file, 'utf8').includes('requireSession')]).toEqual([file, false])
  })

  it('checks for an admin in every page, layout, and route', () => {
    for (const file of entryPoints) {
      expect([file, readFileSync(file, 'utf8').includes('await requireAdmin()')]).toEqual([file, true])
    }
  })

  it('checks for an admin first in every server action', () => {
    for (const file of entryPoints.filter((f) => f.endsWith('actions.ts'))) {
      const source = readFileSync(file, 'utf8')
      const bodies = source.split(/^export async function /m).slice(1)
      expect(bodies.length).toBeGreaterThan(0)
      for (const body of bodies) {
        const name = body.slice(0, body.indexOf('('))
        // The first statement of the action, after its (possibly multi-line) signature.
        const lines = body.split('\n')
        const bodyStart = lines.findIndex((line) => line.trimEnd().endsWith('{')) + 1
        const firstLine = lines.slice(bodyStart).find((line) => line.trim() !== '' && !line.trim().startsWith('//'))
        expect([file, name, firstLine?.includes('await requireAdmin()')]).toEqual([file, name, true])
      }
    }
  })
})
