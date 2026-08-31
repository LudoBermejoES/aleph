/**
 * Unit coverage for where the database file is.
 *
 * The default branch is the load-bearing one: it must produce EXACTLY the path this project has
 * always used, because getting it wrong points a developer's `npm run dev` — or production — at an
 * empty database, which on a campaign wiki looks identical to having lost everything.
 *
 * The `NODE_ENV` test is not paranoia. The rejected design was "use a temp database when
 * NODE_ENV=test"; a stray `NODE_ENV` in a shell would then silently redirect real work. This test
 * is what stops someone adding that later as a convenience.
 *
 * See openspec/changes/isolate-test-database/design.md D4.
 */
import { describe, it, expect } from 'vitest'
import { join } from 'path'
import { resolveDbPath } from '../../../server/utils/db-path'

const DEFAULT = () => join(process.cwd(), 'data', 'aleph.db')

describe('resolveDbPath', () => {
  it('with no override, returns the path this project has always used', () => {
    expect(resolveDbPath({})).toBe(DEFAULT())
  })

  it('uses ALEPH_DB_PATH verbatim when set', () => {
    expect(resolveDbPath({ ALEPH_DB_PATH: '/tmp/aleph-testdb-x/aleph.db' })).toBe(
      '/tmp/aleph-testdb-x/aleph.db',
    )
  })

  it('treats an empty or blank override as unset, rather than as the empty path', () => {
    // An exported-but-empty variable is what a shell leaves behind; resolving it to '' would open a
    // file called "" somewhere unpredictable.
    expect(resolveDbPath({ ALEPH_DB_PATH: '' })).toBe(DEFAULT())
    expect(resolveDbPath({ ALEPH_DB_PATH: '   ' })).toBe(DEFAULT())
  })

  it('NODE_ENV=test alone NEVER redirects the database', () => {
    expect(resolveDbPath({ NODE_ENV: 'test' })).toBe(DEFAULT())
    expect(resolveDbPath({ NODE_ENV: 'production' })).toBe(DEFAULT())
  })

  it('an override wins regardless of NODE_ENV', () => {
    expect(resolveDbPath({ NODE_ENV: 'production', ALEPH_DB_PATH: '/tmp/x.db' })).toBe('/tmp/x.db')
  })

  it('defaults to process.env when called with no argument', () => {
    // The server calls it bare; this is the only test that exercises that path.
    const before = process.env.ALEPH_DB_PATH
    try {
      delete process.env.ALEPH_DB_PATH
      expect(resolveDbPath()).toBe(DEFAULT())
      process.env.ALEPH_DB_PATH = '/tmp/from-process-env.db'
      expect(resolveDbPath()).toBe('/tmp/from-process-env.db')
    } finally {
      if (before === undefined) delete process.env.ALEPH_DB_PATH
      else process.env.ALEPH_DB_PATH = before
    }
  })
})
