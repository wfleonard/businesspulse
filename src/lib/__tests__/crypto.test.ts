import { encryptSecret, decryptSecret, generateEncKey } from '@/lib/crypto'

describe('crypto (AES-256-GCM)', () => {
  it('round-trips a secret', () => {
    const plain = JSON.stringify({ apiKey: 'sk-test-123', baseUrl: 'https://x.io' })
    const enc = encryptSecret(plain)
    expect(enc).not.toContain('sk-test-123')
    expect(decryptSecret(enc)).toBe(plain)
  })

  it('produces different ciphertext each time (random IV)', () => {
    expect(encryptSecret('same')).not.toBe(encryptSecret('same'))
  })

  it('rejects tampered ciphertext (auth tag)', () => {
    const enc = encryptSecret('hello')
    const buf = Buffer.from(enc, 'base64')
    buf[buf.length - 1] ^= 0xff // flip a bit in the ciphertext
    expect(() => decryptSecret(buf.toString('base64'))).toThrow()
  })

  it('rejects too-short payloads', () => {
    expect(() => decryptSecret('YWJj')).toThrow()
  })

  it('generateEncKey returns a 32-byte base64 key', () => {
    const key = generateEncKey()
    expect(Buffer.from(key, 'base64').length).toBe(32)
  })
})
