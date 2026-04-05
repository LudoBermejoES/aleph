import { validateCsrf } from '../utils/csrf'

const SKIP_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname

  if (!path.startsWith('/api/')) return
  if (path.startsWith('/api/auth/')) return
  if (SKIP_METHODS.has(event.method)) return

  // API key requests are not cookie-based — exempt from CSRF
  if (getRequestHeader(event, 'x-api-key')) return

  validateCsrf(event)
})
