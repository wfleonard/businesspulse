import { describeResponse, fieldsFromRow } from '@/lib/connectors/preview'

describe('fieldsFromRow', () => {
  it('flattens top-level and nested object fields with inferred types', () => {
    const fields = fieldsFromRow({
      id: 42,
      total: '1250.50',
      status: 'Sent',
      created_at: '2026-06-01T10:00:00Z',
      active: true,
      rep: { name: 'Sam' },
      tags: ['a', 'b'],
    })
    const byPath = Object.fromEntries(fields.map((f) => [f.path, f.type]))
    expect(byPath['id']).toBe('number')
    expect(byPath['total']).toBe('number (string)')
    expect(byPath['status']).toBe('string')
    expect(byPath['created_at']).toBe('date')
    expect(byPath['active']).toBe('boolean')
    expect(byPath['rep.name']).toBe('string') // recursed into object
    expect(byPath['tags']).toBe('array[2]')
  })
})

describe('describeResponse', () => {
  it('describes rows from a bare array', () => {
    const shape = describeResponse([{ amount: 100, date: '2026-01-01' }])
    expect(shape.rowCount).toBe(1)
    expect(shape.fields.map((f) => f.path).sort()).toEqual(['amount', 'date'])
  })

  it('describes rows at a nested rowsPath', () => {
    const shape = describeResponse({ data: { items: [{ count: 5, d: '2026-02-01' }] } }, 'data.items')
    expect(shape.rowCount).toBe(1)
    expect(shape.fields.map((f) => f.path).sort()).toEqual(['count', 'd'])
  })

  it('surfaces root keys when no rowsPath given but body wraps a list', () => {
    const shape = describeResponse({ campaigns: [{ id: 1 }], meta: { page: 1 } })
    // getRows wraps the object; we expose its keys so the user can find rowsPath.
    expect(shape.fields).toHaveLength(0)
    expect(shape.rootKeys.sort()).toEqual(['campaigns', 'meta'])
  })
})
