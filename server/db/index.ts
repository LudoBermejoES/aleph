import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { ensureDbPath } from '../utils/db-path'

// The third module-level opener in this codebase, after `server/utils/db.ts` and
// `server/utils/auth.ts`. All three must resolve the path the same way or a redirected run reads
// two different databases at once.
const sqlite = new Database(ensureDbPath())

sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')
sqlite.pragma('busy_timeout = 5000')

export const db = drizzle(sqlite)
export { sqlite }
