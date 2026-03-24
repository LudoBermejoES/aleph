import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { useDb } from '../utils/db'
import { logger } from '../utils/logger'
import { join } from 'path'

export default defineNitroPlugin(() => {
  const db = useDb()
  const migrationsFolder = join(process.cwd(), 'server', 'db', 'migrations')

  try {
    migrate(db, { migrationsFolder })
    logger.info('Database migrations applied successfully')
  } catch (error) {
    logger.error('Failed to apply database migrations', { error })
    throw error
  }
})
