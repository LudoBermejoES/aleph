import { auth } from '../../utils/auth'
import { generateWsToken } from '../../services/ws-token'

/**
 * GET /api/ws/token
 *
 * Returns a short-lived, single-use token for WebSocket authentication.
 * The HttpOnly session cookie is validated automatically by the browser
 * sending it with this request. The returned token can then be passed
 * as a query parameter to the WebSocket endpoint.
 */
export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({
    headers: event.headers,
  })

  if (!session) {
    throw createError({ statusCode: 401, message: 'Not authenticated' })
  }

  const token = generateWsToken(session.user.id)
  return { token }
})
