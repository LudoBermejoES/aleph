import { and, eq } from 'drizzle-orm'
import { useDb } from '../../utils/db'
import { apiKey as apiKeyTable } from '../../db/schema/auth'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'id is required' })

  const db = useDb()
  const key = db
    .select({ id: apiKeyTable.id, revokedAt: apiKeyTable.revokedAt })
    .from(apiKeyTable)
    .where(and(eq(apiKeyTable.id, id), eq(apiKeyTable.userId, user.id)))
    .get()

  if (!key) throw createError({ statusCode: 404, message: 'Not found' })

  db.update(apiKeyTable)
    .set({ revokedAt: new Date() })
    .where(eq(apiKeyTable.id, id))
    .run()

  return { ok: true }
})
