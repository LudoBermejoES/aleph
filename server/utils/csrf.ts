import { randomBytes } from 'crypto'
import type { H3Event } from 'h3'

const CSRF_COOKIE = 'csrf_token'
const CSRF_HEADER = 'x-csrf-token'
const isProduction = process.env.NODE_ENV === 'production'

export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex')
}

export function setCsrfCookie(event: H3Event, token: string): void {
  setCookie(event, CSRF_COOKIE, token, {
    httpOnly: false,
    sameSite: 'strict',
    secure: isProduction,
    path: '/',
  })
}

export function validateCsrf(event: H3Event): void {
  const header = getHeader(event, CSRF_HEADER)
  const cookie = getCookie(event, CSRF_COOKIE)

  if (!header || !cookie || header !== cookie) {
    throw createError({ statusCode: 403, message: 'CSRF token mismatch' })
  }
}
