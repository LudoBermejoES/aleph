import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { join } from 'path'
import { mkdirSync } from 'fs'

const DB_DIR = join(process.cwd(), 'data')
mkdirSync(DB_DIR, { recursive: true })

const sqlite = new Database(join(DB_DIR, 'aleph.db'))
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

const db = drizzle(sqlite)

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'sqlite',
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAfter: 60 * 60 * 24, // refresh after 1 day
  },
  trustedOrigins: [
    'http://localhost:3000',
    'http://localhost:3333',
  ],
})
