import { auth } from '../utils/auth'
import { logger } from '../utils/logger'

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname

  // Skip auth routes (Better Auth handles its own auth)
  if (path.startsWith('/api/auth/')) return
  // Skip health endpoint (no auth required)
  if (path === '/api/health') return
  // Skip non-API routes (pages are handled by client-side middleware)
  if (!path.startsWith('/api/')) return

  const session = await auth.api.getSession({
    headers: event.headers,
  })

  if (!session) {
    logger.debug('Auth rejected: no session', { path })
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  logger.debug('Auth accepted', { path, userId: session.user.id, email: session.user.email })

  // Attach user to event context
  event.context.user = {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  }
  event.context.session = session.session
})
