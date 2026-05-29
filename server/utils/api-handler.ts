import { H3Error } from 'h3'
import type { H3Event } from 'h3'
import { logger } from './logger'

/**
 * Wraps an API handler in a consistent try/catch.
 * - H3 errors (createError) are re-thrown as-is with their statusCode preserved.
 * - Unknown errors are wrapped in a generic 500 so internals never leak to clients.
 * - 4xx errors are logged at warn level; 5xx at error level.
 */
export async function withApiHandler<T>(event: H3Event, handler: () => Promise<T>): Promise<T> {
  try {
    return await handler()
  } catch (err) {
    if (err instanceof H3Error) {
      const statusCode = err.statusCode ?? 500
      if (statusCode >= 500) {
        logger.error(`[API] ${event.path} → ${statusCode}: ${err.message}`)
      } else {
        logger.warn(`[API] ${event.path} → ${statusCode}: ${err.message}`)
      }
      throw err
    }
    // Unknown error — log internally, return clean 500 to client
    logger.error(`[API] ${event.path} → 500 (unexpected):`, err)
    throw createError({ statusCode: 500, message: 'Internal server error' })
  }
}
