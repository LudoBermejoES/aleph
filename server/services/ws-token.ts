import { randomBytes } from 'crypto'

/**
 * Short-lived, single-use tokens for WebSocket authentication.
 *
 * Flow:
 * 1. Client calls GET /api/ws/token (HttpOnly session cookie sent automatically)
 * 2. Server validates session, generates a 30s single-use token
 * 3. Client connects to /api/ws?token=<wsToken>&campaignId=<id>
 * 4. WebSocket handler validates and consumes the token
 */

interface WsTokenEntry {
  userId: string
  expiresAt: number
}

const tokenStore = new Map<string, WsTokenEntry>()

const TOKEN_TTL_MS = 30_000 // 30 seconds

export function generateWsToken(userId: string): string {
  const token = randomBytes(32).toString('hex')
  tokenStore.set(token, {
    userId,
    expiresAt: Date.now() + TOKEN_TTL_MS,
  })
  return token
}

export function validateWsToken(token: string): string | null {
  const entry = tokenStore.get(token)
  if (!entry) return null

  // Single-use: always remove
  tokenStore.delete(token)

  // Check expiry
  if (Date.now() > entry.expiresAt) return null

  return entry.userId
}

export function cleanExpiredTokens(): void {
  const now = Date.now()
  for (const [token, entry] of tokenStore) {
    if (now > entry.expiresAt) {
      tokenStore.delete(token)
    }
  }
}
