import { randomUUID } from 'crypto'
import { eq } from 'drizzle-orm'
import { auth } from '../../utils/auth'
import { useDb } from '../../utils/db'
import * as authSchema from '../../db/schema/auth'

/**
 * POST /api/cli/token
 * Exchange email+password for a long-lived CLI bearer token.
 * The token is stored as a session row with userAgent="aleph-cli".
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, password } = body || {}

  if (!email || !password) {
    throw createError({ statusCode: 400, message: 'email and password are required' })
  }

  // Verify credentials via better-auth's sign-in
  let session: any
  try {
    const req = new Request(`${process.env.BETTER_AUTH_URL || 'http://localhost:3333'}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const res = await auth.handler(req)
    if (!res.ok) {
      throw createError({ statusCode: 401, message: 'Invalid credentials' })
    }
    const data = await res.json() as any
    session = data.session
    if (!session?.userId) {
      throw createError({ statusCode: 401, message: 'Invalid credentials' })
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    throw createError({ statusCode: 401, message: 'Invalid credentials' })
  }

  // Create a long-lived CLI session token (1 year)
  const db = useDb()
  const token = randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '')
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365)
  const now = new Date()

  db.insert(authSchema.session).values({
    id: randomUUID(),
    token,
    userId: session.userId,
    userAgent: 'aleph-cli',
    expiresAt,
    createdAt: now,
    updatedAt: now,
  }).run()

  return { token }
})
