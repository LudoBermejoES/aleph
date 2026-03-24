import { logger } from '../utils/logger'
import { randomUUID } from 'crypto'

const EXCLUDED_PATHS = [
  '/_nuxt/',
  '/favicon.ico',
  '/robots.txt',
  '/__nuxt_devtools__',
  '/api/health',
]

export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname

  // Skip static assets and health checks
  if (EXCLUDED_PATHS.some(p => path.startsWith(p))) return

  const requestId = randomUUID()
  const method = event.method
  const start = performance.now()

  // Set request ID header for tracing
  setResponseHeader(event, 'X-Request-Id', requestId)

  event.node.res.on('finish', () => {
    const duration = Math.round(performance.now() - start)
    const status = event.node.res.statusCode

    logger.http('request', {
      requestId,
      method,
      path,
      status,
      duration,
    })
  })
})
