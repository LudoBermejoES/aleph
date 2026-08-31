import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as authSchema from '../db/schema/auth'
import { ensureDbPath } from './db-path'

// better-auth opens its OWN connection, so it needs the resolver too. Missing this is not a
// theoretical risk: a test run pointed at a throwaway database still wrote its 220 sign-ups into
// `data/aleph.db` while every campaign went to the temp file, so sessions and campaigns lived in
// different databases and 475 tests failed. See openspec/changes/isolate-test-database/.
const sqlite = new Database(ensureDbPath())
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

const db = drizzle(sqlite, { schema: authSchema })

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3333',
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema: authSchema,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  user: {
    additionalFields: {
      role: {
        type: 'string' as const,
        defaultValue: 'user',
        input: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAfter: 60 * 60 * 24, // refresh after 1 day
  },
  trustedOrigins: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3333'],
  advanced: {
    cookiePrefix: 'better-auth',
    cookies: {
      session_token: {
        attributes: {
          sameSite: 'strict' as const,
          secure: process.env.NODE_ENV === 'production',
        },
      },
    },
  },
})
