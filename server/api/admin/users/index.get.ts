import { useDb } from '../../../utils/db'
import { requireAdmin } from '../../../utils/requireAdmin'
import { user } from '../../../db/schema/auth'
import { asc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const db = useDb()

  const users = db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(asc(user.createdAt))
    .all()

  return users
})
