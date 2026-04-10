import { like, or, eq } from 'drizzle-orm'
import { useDb } from '../../utils/db'
import { user } from '../../db/schema/auth'

function redactEmail(email: string): string {
  const [local, domain] = email.split('@')
  return `${local[0]}***@${domain}`
}

export default defineEventHandler(async (event) => {
  if (!event.context.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const query = getQuery(event)
  const q = (query.q as string)?.trim()

  if (!q) {
    throw createError({ statusCode: 400, message: 'Query parameter q is required' })
  }

  const db = useDb()

  const results = db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(or(like(user.name, `%${q}%`), eq(user.email, q)))
    .limit(10)
    .all()

  return results.map((u) => ({
    id: u.id,
    name: u.name,
    email: redactEmail(u.email),
  }))
})
