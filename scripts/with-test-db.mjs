#!/usr/bin/env node
/**
 * Run a command against a fresh, empty database that lives outside the repository.
 *
 *   node scripts/with-test-db.mjs <command> [args...]
 *
 * Why this exists: the integration and e2e suites used to run against `data/aleph.db` and never
 * cleaned up. That database reached **3.62 GB** holding 1,733 campaigns — 4 real and 1,729 left by
 * tests — against production's 171 MB with the same four. Deleting the leftover rows reclaims
 * **0.4%**: 97% of the file is `sqlite-vec` chunks, which are allocated 1,024 slots at a time and
 * never freed on delete, so the growth is monotonic and no cleanup undoes it.
 *
 * An empty file is a COMPLETE seed and no fixture is needed: `server/plugins/migrations.ts` applies
 * every migration on boot and `server/plugins/watcher.ts` runs `initFTS5`/`initVecTable`
 * unconditionally. With no rows there is also nothing to backfill, so the startup backfills cost
 * nothing here.
 *
 * The file goes under the OS temp dir on purpose. On this checkout that is ext4, while the repo is
 * on a v9fs/DrvFs mount measured **30–150× slower** for small-file operations.
 *
 * See openspec/changes/isolate-test-database/.
 */
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const argv = process.argv.slice(2)
if (argv.length === 0) {
  console.error('usage: node scripts/with-test-db.mjs <command> [args...]')
  process.exit(2)
}

/** Is anything already listening here? */
function portInUse(port) {
  return new Promise((resolve) => {
    const probe = createServer()
    probe.once('error', (err) => resolve(err.code === 'EADDRINUSE'))
    probe.once('listening', () => probe.close(() => resolve(false)))
    probe.listen(port, '127.0.0.1')
  })
}

/**
 * Refuse to run when the dev port is already taken, and this is the load-bearing guard of the whole
 * script.
 *
 * Measured 2026-08-31: with a server already up on 3333, `start-server-and-test` printed
 * "Another Nuxt dev server is already running", the server it tried to start died, and it ran all
 * 1,077 integration tests against the EXISTING one — whose environment held no `ALEPH_DB_PATH`, so
 * every test wrote into `data/aleph.db`. The suite reported normally and the development database
 * gained 170 campaigns and 355 MB. Nothing failed; the isolation simply did not happen.
 *
 * A different port is not an escape: better-auth only trusts 3000, 3001 and 3333, so the port is
 * effectively fixed and the only safe answer is to stop and say so.
 */
const PORT = Number(process.env.TEST_DB_PORT || 3333)
if (await portInUse(PORT)) {
  console.error(
    `[with-test-db] port ${PORT} is already in use.\n` +
      `  Something is already serving there, and it is pointed at whatever database it was started\n` +
      `  with -- almost certainly data/aleph.db. Reusing it would run the whole suite against your\n` +
      `  development database while every test passed.\n` +
      `  Stop that server and run this again (or set TEST_DB_PORT if the suite uses another port).`,
  )
  process.exit(1)
}

const dir = mkdtempSync(join(tmpdir(), 'aleph-testdb-'))
const dbPath = join(dir, 'aleph.db')

/**
 * Remove the database and its WAL siblings. Idempotent, and it must never be the reason the run
 * reports a failure — the child's exit code is the answer, not the cleanup's.
 */
let cleaned = false
function cleanup() {
  if (cleaned) return
  cleaned = true
  try {
    rmSync(dir, { recursive: true, force: true })
  } catch (err) {
    console.error(`[with-test-db] could not remove ${dir}: ${err.message}`)
  }
}

console.error(`[with-test-db] ALEPH_DB_PATH=${dbPath}`)

const child = spawn(argv[0], argv.slice(1), {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, ALEPH_DB_PATH: dbPath },
})

// Clean up on the child's exit, on our own exit, and on a signal — a red run or a Ctrl-C must not
// leave the file behind.
child.on('exit', (code, signal) => {
  cleanup()
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 1)
})
child.on('error', (err) => {
  console.error(`[with-test-db] failed to start ${argv[0]}: ${err.message}`)
  cleanup()
  process.exit(1)
})
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(sig, () => {
    child.kill(sig)
  })
}
process.on('exit', cleanup)
