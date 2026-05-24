import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'

function getKey(): Buffer {
  const secret = process.env.SECRET_KEY
  if (!secret) {
    throw new Error('SECRET_KEY env var is required for encrypting stored secrets.')
  }
  // Accept either a 32-byte hex string (preferred) or any string we hash to 32 bytes.
  if (/^[0-9a-fA-F]{64}$/.test(secret)) {
    return Buffer.from(secret, 'hex')
  }
  return createHash('sha256').update(secret).digest()
}

export interface EncryptedPayload {
  ciphertext: string
  iv: string
  tag: string
}

export function encryptSecret(plain: string): EncryptedPayload {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, getKey(), iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    ciphertext: enc.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  }
}

export function decryptSecret(payload: EncryptedPayload): string {
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(payload.iv, 'base64'))
  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'))
  const dec = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'base64')),
    decipher.final(),
  ])
  return dec.toString('utf8')
}

export function maskSecret(secret: string): string {
  if (!secret) return ''
  if (secret.length <= 12) return '••••••••'
  return `${secret.slice(0, 7)}••••••••••••••${secret.slice(-4)}`
}
