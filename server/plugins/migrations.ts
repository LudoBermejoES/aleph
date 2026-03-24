import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { useDb } from '../utils/db'
import { join } from 'path'

export default defineNitroPlugin(() => {
  const db = useDb()
  const migrationsFolder = join(process.cwd(), 'server', 'db', 'migrations')

  try {
    migrate(db, { migrationsFolder })
    console.log('[aleph] Database migrations applied successfully')
  } catch (error) {
    console.error('[aleph] Failed to apply database migrations:', error)
    throw error
  }
})
