import { createHash } from 'crypto'

/**
 * ETag middleware for GET requests to /api/campaigns/ endpoints.
 * Buffers the response body, computes a SHA-1 ETag, and returns 304 if
 * the client sends a matching If-None-Match header.
 */
export default defineEventHandler(async (event) => {
  if (event.method !== 'GET') return
  const path = getRequestURL(event).pathname
  if (!path.startsWith('/api/campaigns/')) return

  const res = event.node.res
  const chunks: Buffer[] = []
  const originalWrite = res.write.bind(res)
  const originalEnd = res.end.bind(res)

  // Buffer all response writes
  res.write = (chunk: any, ...args: any[]) => {
    if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    return true
  }

  res.end = (chunk?: any, ...args: any[]) => {
    if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))

    const contentType = res.getHeader('content-type') as string ?? ''
    if (!contentType.includes('application/json') || res.statusCode >= 400) {
      // Pass through non-JSON or error responses unchanged
      if (chunks.length) {
        res.write = originalWrite
        res.end = originalEnd
        const body = Buffer.concat(chunks)
        originalEnd(body)
      } else {
        res.write = originalWrite
        res.end = originalEnd
        originalEnd()
      }
      return res
    }

    const body = Buffer.concat(chunks)
    const etag = `"${createHash('sha1').update(body).digest('hex').slice(0, 16)}"`
    const ifNoneMatch = event.node.req.headers['if-none-match']

    res.write = originalWrite
    res.end = originalEnd

    if (ifNoneMatch === etag) {
      res.statusCode = 304
      res.setHeader('ETag', etag)
      res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate')
      originalEnd()
    } else {
      res.setHeader('ETag', etag)
      res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate')
      originalEnd(body)
    }
    return res
  }
})
