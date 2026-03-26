import { eq } from 'drizzle-orm'
import { auth } from '../utils/auth'
import { useDb } from '../utils/db'
import { logger } from '../utils/logger'
import { session as sessionTable, user as userTable } from '../db/schema/auth'

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname

  // Skip auth routes (Better Auth handles its own auth)
  if (path.startsWith('/api/auth/')) return
  // Skip CLI token endpoints (handle their own auth)
  if (path === '/api/cli/token') return
  // Skip health endpoint (no auth required)
  if (path === '/api/health') return
  // Skip non-API routes (pages are handled by client-side middleware)
  if (!path.startsWith('/api/')) return

  // Support CLI bearer token auth (Authorization: Bearer <token>)
  const authHeader = getHeader(event, 'authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const db = useDb()
    const row = db
      .select({ session: sessionTable, user: userTable })
      .from(sessionTable)
      .innerJoin(userTable, eq(sessionTable.userId, userTable.id))
      .where(eq(sessionTable.token, token))
      .get()

    if (!row || row.session.expiresAt < new Date()) {
      logger.debug('Auth rejected: invalid or expired CLI token', { path })
      throw createError({ statusCode: 401, message: 'Unauthorized' })
    }

    logger.debug('Auth accepted (CLI token)', { path, userId: row.user.id })
    event.context.user = { id: row.user.id, email: row.user.email, name: row.user.name }
    event.context.session = row.session
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
