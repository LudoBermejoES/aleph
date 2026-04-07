import type { H3Event } from 'h3'
import { logger } from '../utils/logger'

interface NitroError {
  statusCode?: number
  message?: string
  stack?: string
  cause?: { stack?: string }
}

/**
 * Global Nitro error handler.
 * Logs all unhandled API errors (4xx + 5xx) to Winston so they appear
 * in the combined/error log files, not just in PM2 stderr.
 * 404s are intentionally excluded — they are expected (new blank diagrams,
 * missing entities, etc.) and are handled client-side.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', (error: unknown, { event }: { event?: H3Event }) => {
    const e = error as NitroError
    const status = e?.statusCode ?? 500
    const method = event?.method ?? 'UNKNOWN'
    const path = event ? getRequestURL(event).pathname : 'unknown'
    const requestId = event?.node?.res?.getHeader('X-Request-Id') ?? '-'

    const meta = {
      requestId,
      method,
      path,
      status,
      message: e?.message,
      stack: e?.cause?.stack ?? e?.stack,
    }

    if (status >= 500) {
      logger.error('unhandled server error', meta)
    } else if (status >= 400 && status !== 404) {
      logger.warn('client error', meta)
    }
  })
})
