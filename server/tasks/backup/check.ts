import { listArchives, isBackupConfigured } from '../../services/backup'
import { logger } from '../../utils/logger'

const MAX_AGE_HOURS = 36

export default defineTask({
  meta: {
    name: 'backup:check',
    description: 'Verify the latest backup is fresh (within 36 hours)',
  },
  async run() {
    if (!isBackupConfigured()) {
      return { result: { status: 'skipped', message: 'R2 not configured' } }
    }

    try {
      const archives = await listArchives()

      if (archives.length === 0) {
        logger.warn('backup:check: no backups found')
        return { result: { status: 'stale', message: 'No backups found', ageHours: null } }
      }

      const latest = archives[0] // already sorted newest-first
      const ageMs = Date.now() - latest.lastModified.getTime()
      const ageHours = Math.round((ageMs / 3600000) * 10) / 10

      if (ageHours > MAX_AGE_HOURS) {
        logger.warn('backup:check: latest backup is stale', {
          latestKey: latest.key,
          ageHours,
          maxAgeHours: MAX_AGE_HOURS,
        })
        return {
          result: {
            status: 'stale',
            latestKey: latest.key,
            ageHours,
            message: `Latest backup is ${ageHours}h old (max: ${MAX_AGE_HOURS}h)`,
          },
        }
      }

      logger.info('backup:check: healthy', { latestKey: latest.key, ageHours })
      return {
        result: {
          status: 'ok',
          latestKey: latest.key,
          ageHours,
          totalArchives: archives.length,
        },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error('backup:check: failed', { error: message })
      return { result: { status: 'error', message } }
    }
  },
})
