import { randomUUID } from 'crypto'
import { useDb } from '../../utils/db'
import { generateApiKey } from '../../utils/apiKey'
import { apiKey as apiKeyTable } from '../../db/schema/auth'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = await readBody(event)
  const { name } = body || {}
  if (!name || typeof name !== 'string' || !name.trim()) {
    throw createError({ statusCode: 400, message: 'name is required' })
  }

  const db = useDb()
  const { raw, hash, prefix } = generateApiKey()
  const id = randomUUID()
  const now = new Date()

  db.insert(apiKeyTable).values({
    id,
    userId: user.id,
    name: name.trim(),
    keyHash: hash,
    keyPrefix: prefix,
    createdAt: now,
  }).run()

  return { id, name: name.trim(), key: raw, keyPrefix: prefix, createdAt: now }
})
