/**
 * Where the SQLite file lives — the single answer, for the server and for any test that opens the
 * database itself.
 *
 * This exists because the path used to be composed in three places by hand: `server/utils/db.ts`
 * and two integration tests. That is fine while there is one database and fatal the moment there
 * are two: redirect the server and those tests keep reading `data/aleph.db`, so a run has two
 * databases in it and the assertions keep passing. See
 * openspec/changes/isolate-test-database/design.md D3.
 *
 * Deliberately imports no driver, so a test can ask the question without pulling in
 * `better-sqlite3`.
 */
import { mkdirSync } from 'fs'
import { dirname, join } from 'path'

/**
 * Resolve the database file.
 *
 * `ALEPH_DB_PATH`, when set and non-empty, is used verbatim. Otherwise the result is exactly what
 * this project has always used: `<cwd>/data/aleph.db`.
 *
 * It does NOT look at `NODE_ENV`, and that is a decision rather than an omission (design D4). A
 * rule like "temp database when NODE_ENV=test" means a stray `NODE_ENV` left in a shell silently
 * points `npm run dev` at an empty database — which on a campaign wiki is indistinguishable from
 * having lost everything. An unset `ALEPH_DB_PATH` always means the real database; a test run says
 * so explicitly.
 */
export function resolveDbPath(env: NodeJS.ProcessEnv = process.env): string {
  const override = env.ALEPH_DB_PATH?.trim()
  return override ? override : join(process.cwd(), 'data', 'aleph.db')
}

/** Resolve the path and make sure its directory exists, which is what an opener needs. */
export function ensureDbPath(env: NodeJS.ProcessEnv = process.env): string {
  const path = resolveDbPath(env)
  mkdirSync(dirname(path), { recursive: true })
  return path
}
