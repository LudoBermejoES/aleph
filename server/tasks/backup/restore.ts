import { join } from 'path'
import { rm, cp, mkdir } from 'fs/promises'
import {
  downloadArchive,
  extractArchive,
  getLatestArchiveKey,
  isBackupConfigured,
} from '../../services/backup'
import { logger } from '../../utils/logger'

export default defineTask({
  meta: {
    name: 'backup:restore',
    description: 'Restore data from a backup archive in Cloudflare R2',
  },
  async run({ payload }) {
    if (!isBackupConfigured()) {
      return { result: { status: 'error', message: 'R2 not configured' } }
    }

    const deployPath = process.cwd()
    const requestedKey = (payload as { key?: string })?.key
    const key = requestedKey || (await getLatestArchiveKey())

    if (!key) {
      return { result: { status: 'error', message: 'No backup archives found' } }
    }

    const stagingDir = join(deployPath, 'data', '.restore-staging')
    const preRestoreDir = join(deployPath, 'data', '.pre-restore-backup')

    try {
      logger.info('backup:restore: starting', { key })

      // Create pre-restore safety backup of current data
      await rm(preRestoreDir, { recursive: true, force: true })
      await mkdir(preRestoreDir, { recursive: true })
      await cp(join(deployPath, 'data', 'aleph.db'), join(preRestoreDir, 'aleph.db')).catch(
        () => {},
      )
      await cp(join(deployPath, 'content'), join(preRestoreDir, 'content'), {
        recursive: true,
      }).catch(() => {})
      await cp(join(deployPath, '.env'), join(preRestoreDir, '.env')).catch(() => {})
      logger.info('backup:restore: pre-restore backup created')

      // Download and extract
      await rm(stagingDir, { recursive: true, force: true })
      await mkdir(stagingDir, { recursive: true })
      const archivePath = join(stagingDir, 'archive.tar.gz')
      await downloadArchive(key, archivePath)
      await extractArchive(archivePath, stagingDir)

      // Replace current data with restored data
      const restoredDb = join(stagingDir, 'aleph.db')
      await cp(restoredDb, join(deployPath, 'data', 'aleph.db')).catch((e) => {
        throw new Error(`Failed to restore database: ${e.message}`)
      })

      const restoredContent = join(stagingDir, 'content')
      await cp(restoredContent, join(deployPath, 'content'), { recursive: true }).catch(() => {
        logger.warn('backup:restore: no content directory in archive')
      })

      const restoredEnv = join(stagingDir, '.env')
      await cp(restoredEnv, join(deployPath, '.env')).catch(() => {
        logger.warn('backup:restore: no .env in archive')
      })

      logger.info('backup:restore: complete', { key })

      return {
        result: {
          status: 'ok',
          restoredKey: key,
          preRestoreBackup: preRestoreDir,
          note: 'Restart the server to pick up the restored database',
        },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error('backup:restore: failed', { error: message })
      return { result: { status: 'error', message } }
    } finally {
      await rm(stagingDir, { recursive: true, force: true }).catch(() => {})
    }
  },
})
