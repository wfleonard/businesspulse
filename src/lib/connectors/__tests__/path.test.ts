import { getPath, getRows } from '@/lib/connectors/path'

describe('getPath', () => {
  const obj = { a: { b: [{ c: 5 }, { c: 6 }] }, list: [1, 2, 3] }

  it('reads nested dot paths', () => {
    expect(getPath(obj, 'a.b[0].c')).toBe(5)
    expect(getPath(obj, 'a.b[1].c')).toBe(6)
  })
  it('reads array indexes', () => {
    expect(getPath(obj, 'list[2]')).toBe(3)
  })
  it('returns the whole object for empty path', () => {
    expect(getPath(obj, '')).toBe(obj)
  })
  it('returns undefined for missing segments (no throw)', () => {
    expect(getPath(obj, 'a.x.y')).toBeUndefined()
    expect(getPath(obj, 'a.b[9].c')).toBeUndefined()
    expect(getPath(null, 'a.b')).toBeUndefined()
  })
})

describe('getRows', () => {
  it('returns the array at a path', () => {
    expect(getRows({ data: { items: [1, 2] } }, 'data.items')).toEqual([1, 2])
  })
  it('returns the body when it is already an array', () => {
    expect(getRows([1, 2, 3])).toEqual([1, 2, 3])
  })
  it('wraps a single object as one row', () => {
    expect(getRows({ value: 5 })).toEqual([{ value: 5 }])
  })
  it('returns [] for missing path', () => {
    expect(getRows({}, 'nope.here')).toEqual([])
  })
})
