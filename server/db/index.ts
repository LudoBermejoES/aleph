import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { join } from 'path'
import { mkdirSync } from 'fs'

const DB_DIR = join(process.cwd(), 'data')
const DB_PATH = join(DB_DIR, 'aleph.db')

mkdirSync(DB_DIR, { recursive: true })

const sqlite = new Database(DB_PATH)

sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')
sqlite.pragma('busy_timeout = 5000')

export const db = drizzle(sqlite)
export { sqlite }
