import { createHash, randomBytes } from 'crypto'

export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const raw = 'aleph_' + randomBytes(32).toString('hex')
  const hash = hashApiKey(raw)
  const prefix = raw.slice(0, 14) // 'aleph_' + first 8 hex chars
  return { raw, hash, prefix }
}

export function hashApiKey(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}
