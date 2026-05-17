import { eq } from 'drizzle-orm'
import { useDb } from '../../../utils/db'
import { requireAdmin } from '../../../utils/requireAdmin'
import { user } from '../../../db/schema/auth'

export default defineEventHandler(async (event) => {
  const currentUser = requireAdmin(event)
  const id = getRouterParam(event, 'id')!

  if (id === currentUser.id) {
    throw createError({ statusCode: 403, message: 'Cannot delete your own account' })
  }

  const db = useDb()
  const target = db.select({ id: user.id }).from(user).where(eq(user.id, id)).get()
  if (!target) throw createError({ statusCode: 404, message: 'User not found' })

  db.delete(user).where(eq(user.id, id)).run()

  setResponseStatus(event, 204)
  return null
})
