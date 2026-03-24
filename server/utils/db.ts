import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { mkdirSync } from 'fs'
import { join } from 'path'

let _db: BetterSQLite3Database | null = null
let _sqlite: Database.Database | null = null

/**
 * Get the Drizzle database instance.
 * Supports dependency injection for testing: call setDb() to override.
 */
export function useDb(): BetterSQLite3Database {
  if (!_db) {
    const dbDir = join(process.cwd(), 'data')
    const dbPath = join(dbDir, 'aleph.db')
    mkdirSync(dbDir, { recursive: true })

    _sqlite = new Database(dbPath)
    _sqlite.pragma('journal_mode = WAL')
    _sqlite.pragma('foreign_keys = ON')
    _sqlite.pragma('busy_timeout = 5000')

    _db = drizzle(_sqlite)
  }
  return _db
}

/**
 * Get the raw SQLite instance (for FTS5 raw queries).
 */
export function useSqlite(): Database.Database {
  useDb() // ensure initialized
  return _sqlite!
}

/**
 * Override the database instance (for testing with :memory: SQLite).
 */
export function setDb(db: BetterSQLite3Database, sqlite?: Database.Database) {
  _db = db
  if (sqlite) _sqlite = sqlite
}

/**
 * Close the database connection.
 */
export function closeDb() {
  _sqlite?.close()
  _db = null
  _sqlite = null
}
