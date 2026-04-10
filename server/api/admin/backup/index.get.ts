import { listArchives, isBackupConfigured } from '../../../services/backup'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  if (!isBackupConfigured()) {
    return { configured: false, archives: [] }
  }

  const archives = await listArchives()

  return {
    configured: true,
    archives: archives.map((a) => ({
      key: a.key,
      size: a.size,
      sizeMB: Math.round((a.size / 1024 / 1024) * 10) / 10,
      lastModified: a.lastModified.toISOString(),
    })),
  }
})
