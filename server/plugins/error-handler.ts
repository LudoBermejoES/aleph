import { logger } from '../utils/logger'

/**
 * Global Nitro error handler.
 * Logs all unhandled API errors (4xx + 5xx) to Winston so they appear
 * in the combined/error log files, not just in PM2 stderr.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', (error: any, { event }: any) => {
    const status = error?.statusCode ?? 500
    const method = event?.method ?? 'UNKNOWN'
    const path = event ? getRequestURL(event).pathname : 'unknown'
    const requestId = event?.node?.res?.getHeader('X-Request-Id') ?? '-'

    const meta = {
      requestId,
      method,
      path,
      status,
      message: error?.message,
      stack: error?.cause?.stack ?? error?.stack,
    }

    if (status >= 500) {
      logger.error('unhandled server error', meta)
    } else if (status >= 400) {
      logger.warn('client error', meta)
    }
  })
})
