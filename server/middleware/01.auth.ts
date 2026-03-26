import { and, eq, isNull } from 'drizzle-orm'
import { auth } from '../utils/auth'
import { useDb } from '../utils/db'
import { logger } from '../utils/logger'
import { hashApiKey } from '../utils/apiKey'
import { apiKey as apiKeyTable, user as userTable } from '../db/schema/auth'

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname

  // Skip auth routes (Better Auth handles its own auth)
  if (path.startsWith('/api/auth/')) return
  // Skip health endpoint (no auth required)
  if (path === '/api/health') return
  // Skip non-API routes (pages are handled by client-side middleware)
  if (!path.startsWith('/api/')) return

  // Support API key auth (X-API-Key header)
  const apiKeyHeader = getHeader(event, 'x-api-key')
  if (apiKeyHeader) {
    const db = useDb()
    const hash = hashApiKey(apiKeyHeader)
    const row = db
      .select({ key: apiKeyTable, user: userTable })
      .from(apiKeyTable)
      .innerJoin(userTable, eq(apiKeyTable.userId, userTable.id))
      .where(and(eq(apiKeyTable.keyHash, hash), isNull(apiKeyTable.revokedAt)))
      .get()

    if (!row) {
      logger.debug('Auth rejected: invalid or revoked API key', { path })
      throw createError({ statusCode: 401, message: 'Unauthorized' })
    }

    logger.debug('Auth accepted (API key)', { path, userId: row.user.id })
    event.context.user = { id: row.user.id, email: row.user.email, name: row.user.name }

    // Update lastUsedAt asynchronously (fire-and-forget)
    setImmediate(() => {
      db.update(apiKeyTable)
        .set({ lastUsedAt: new Date() })
        .where(eq(apiKeyTable.id, row.key.id))
        .run()
    })

    return
  }

  // Fall back to better-auth cookie session (browser)
  const session = await auth.api.getSession({
    headers: event.headers,
  })

  if (!session) {
    logger.debug('Auth rejected: no session', { path })
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  logger.debug('Auth accepted', { path, userId: session.user.id, email: session.user.email })

  event.context.user = {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  }
  event.context.session = session.session
})
