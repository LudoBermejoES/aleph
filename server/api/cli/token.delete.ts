import { eq } from 'drizzle-orm'
import { useDb } from '../../utils/db'
import { session as sessionTable } from '../../db/schema/auth'

/**
 * DELETE /api/cli/token
 * Revokes the CLI bearer token used in the current request.
 */
export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 400, message: 'No bearer token provided' })
  }

  const token = authHeader.slice(7)
  const db = useDb()
  db.delete(sessionTable).where(eq(sessionTable.token, token)).run()

  return { success: true }
})
