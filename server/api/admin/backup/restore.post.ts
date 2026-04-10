import { isBackupConfigured } from '../../../services/backup'
import { logger } from '../../../utils/logger'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  if (!isBackupConfigured()) {
    throw createError({ statusCode: 400, message: 'Backup R2 credentials not configured' })
  }

  const body = await readBody(event)
  const key = body?.key as string | undefined

  logger.info('backup: restore triggered', { userId: user.id, key: key || 'latest' })

  const result = await runTask('backup:restore', { payload: { key } })

  return result
})
