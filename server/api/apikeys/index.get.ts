import { eq } from 'drizzle-orm'
import { useDb } from '../../utils/db'
import { apiKey as apiKeyTable } from '../../db/schema/auth'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const db = useDb()
  const keys = db
    .select({
      id: apiKeyTable.id,
      name: apiKeyTable.name,
      keyPrefix: apiKeyTable.keyPrefix,
      createdAt: apiKeyTable.createdAt,
      lastUsedAt: apiKeyTable.lastUsedAt,
      revokedAt: apiKeyTable.revokedAt,
    })
    .from(apiKeyTable)
    .where(eq(apiKeyTable.userId, user.id))
    .all()

  return keys
})
