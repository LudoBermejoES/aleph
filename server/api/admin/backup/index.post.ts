import { isBackupConfigured } from '../../../services/backup'
import { logger } from '../../../utils/logger'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  if (!isBackupConfigured()) {
    throw createError({ statusCode: 400, message: 'Backup R2 credentials not configured' })
  }

  logger.info('backup: manual backup triggered', { userId: user.id })

  const result = await runTask('backup:run')

  return result
})
