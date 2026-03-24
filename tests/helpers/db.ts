import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

export interface TestDb {
  db: BetterSQLite3Database
  sqlite: Database.Database
  close: () => void
}

/**
 * Create an in-memory SQLite database with all migrations applied.
 * Use in beforeEach/afterEach for fully isolated tests.
 */
export function createTestDb(): TestDb {
  const sqlite = new Database(':memory:')
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  // Apply all migrations in order
  const migrationsDir = join(process.cwd(), 'server', 'db', 'migrations')
  try {
    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort()

    for (const file of files) {
      const sql = readFileSync(join(migrationsDir, file), 'utf-8')
      sqlite.exec(sql)
    }
  } catch {
    // No migrations yet -- tables will be created by test setup if needed
  }

  const db = drizzle(sqlite)

  return {
    db,
    sqlite,
    close: () => sqlite.close(),
  }
}
