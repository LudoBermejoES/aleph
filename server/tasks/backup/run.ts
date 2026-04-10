import { join } from 'path'
import { rm, stat } from 'fs/promises'
import {
  createBackupArchive,
  uploadArchive,
  applyRetention,
  generateBackupKey,
  isBackupConfigured,
} from '../../services/backup'
import { logger } from '../../utils/logger'

export default defineTask({
  meta: {
    name: 'backup:run',
    description: 'Create a backup archive and upload to Cloudflare R2',
  },
  async run() {
    if (!isBackupConfigured()) {
      logger.warn('backup:run: R2 credentials not configured, skipping')
      return { result: { status: 'skipped', message: 'R2 not configured' } }
    }

    const stagingDir = join(process.cwd(), 'data', '.backup-staging')

    try {
      logger.info('backup:run: starting')

      // Create archive
      const archivePath = await createBackupArchive(stagingDir)
      const archiveStats = await stat(archivePath)
      const sizeMB = (archiveStats.size / 1024 / 1024).toFixed(1)

      // Upload to R2
      const key = generateBackupKey()
      await uploadArchive(archivePath, key)

      // Apply retention policy
      const pruned = await applyRetention()

      logger.info('backup:run: complete', { key, sizeMB, pruned: pruned.length })

      return {
        result: {
          status: 'ok',
          key,
          sizeMB: Number(sizeMB),
          prunedCount: pruned.length,
        },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error('backup:run: failed', { error: message })
      return { result: { status: 'error', message } }
    } finally {
      // Clean up staging
      await rm(stagingDir, { recursive: true, force: true }).catch(() => {})
    }
  },
})
