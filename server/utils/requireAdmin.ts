import type { H3Event } from 'h3'

export function requireAdmin(event: H3Event) {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })
  if (user.role !== 'admin') throw createError({ statusCode: 403, message: 'Forbidden' })
  return user
}
