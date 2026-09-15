/** @jest-environment node */
import { createHash } from 'crypto'
import { hashToken, looksLikeToken, newPublicId, newVerifyToken, VERIFY_TOKEN_TTL_MS } from '../tokens'

describe('verification tokens', () => {
  it('creates a 43-character base64url token whose sha256 is the stored hash', () => {
    const { token, hash } = newVerifyToken()
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(hash).toBe(createHash('sha256').update(token).digest('hex'))
    expect(hashToken(token)).toBe(hash)
  })

  it('expires 24 hours after creation', () => {
    const now = new Date('2026-09-15T12:00:00Z')
    expect(newVerifyToken(now).expiresAt.toISOString()).toBe('2026-09-16T12:00:00.000Z')
    expect(VERIFY_TOKEN_TTL_MS).toBe(86_400_000)
  })

  it('never repeats', () => {
    const tokens = new Set(Array.from({ length: 200 }, () => newVerifyToken().token))
    expect(tokens.size).toBe(200)
  })

  it('shape-checks tokens before any database lookup', () => {
    expect(looksLikeToken(newVerifyToken().token)).toBe(true)
    expect(looksLikeToken('short')).toBe(false)
    expect(looksLikeToken(`${'a'.repeat(42)}!`)).toBe(false)
    expect(looksLikeToken(['a'])).toBe(false)
    expect(looksLikeToken(undefined)).toBe(false)
  })
})

describe('newPublicId', () => {
  it('is 24 base64url characters and unique', () => {
    const ids = Array.from({ length: 200 }, () => newPublicId())
    for (const id of ids) expect(id).toMatch(/^[A-Za-z0-9_-]{24}$/)
    expect(new Set(ids).size).toBe(200)
  })
})
