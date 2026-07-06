import crypto from 'crypto'

/**
 * Authenticated symmetric encryption for connector credentials at rest.
 *
 * AES-256-GCM. The key comes from CONNECTOR_ENC_KEY, which must be 32 bytes
 * supplied as base64 or hex (64 hex chars). Output format (base64):
 *   [12-byte IV][16-byte auth tag][ciphertext]
 */

const IV_LEN = 12
const TAG_LEN = 16

function getKey(): Buffer {
  const raw = process.env.CONNECTOR_ENC_KEY
  if (!raw) throw new Error('Missing required environment variable: CONNECTOR_ENC_KEY')

  let key: Buffer
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    key = Buffer.from(raw, 'hex')
  } else {
    key = Buffer.from(raw, 'base64')
  }
  if (key.length !== 32) {
    throw new Error('CONNECTOR_ENC_KEY must decode to exactly 32 bytes (hex or base64)')
  }
  return key
}

export function encryptSecret(plaintext: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(IV_LEN)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString('base64')
}

export function decryptSecret(payload: string): string {
  const key = getKey()
  const buf = Buffer.from(payload, 'base64')
  if (buf.length < IV_LEN + TAG_LEN) {
    throw new Error('Ciphertext too short')
  }
  const iv = buf.subarray(0, IV_LEN)
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN)
  const enc = buf.subarray(IV_LEN + TAG_LEN)
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
}

/** Generate a fresh 32-byte key as base64 — helper for provisioning. */
export function generateEncKey(): string {
  return crypto.randomBytes(32).toString('base64')
}
