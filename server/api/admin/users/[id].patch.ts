import { eq } from 'drizzle-orm'
import { hashPassword } from 'better-auth/crypto'
import { useDb } from '../../../utils/db'
import { requireAdmin } from '../../../utils/requireAdmin'
import { user, account } from '../../../db/schema/auth'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = getRouterParam(event, 'id')!
  const body = await readBody<{ name?: string; email?: string; password?: string; role?: string }>(
    event,
  )

  const db = useDb()

  const target = db.select().from(user).where(eq(user.id, id)).get()
  if (!target) throw createError({ statusCode: 404, message: 'User not found' })

  const updates: Partial<typeof user.$inferInsert> = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.email !== undefined) updates.email = body.email
  if (body.role !== undefined) updates.role = body.role

  if (Object.keys(updates).length > 0) {
    db.update(user).set(updates).where(eq(user.id, id)).run()
  }

  if (body.password) {
    const hashed = await hashPassword(body.password)
    db.update(account).set({ password: hashed }).where(eq(account.userId, id)).run()
  }

  const updated = db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(eq(user.id, id))
    .get()

  return updated
})
