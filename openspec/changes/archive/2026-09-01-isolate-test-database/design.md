# Design

## D1 — An empty file is the whole seed

`server/plugins/migrations.ts` applies the Drizzle migrations on every boot, and
`server/plugins/watcher.ts` runs `initFTS5` and `initVecTable` **ungated** (only the backfills sit
behind `STARTUP_BACKFILLS_ENABLED`). So pointing the server at a path that does not exist yields a
fully migrated database with both search indexes initialised, with no seed file involved.

That is strictly better than a checked-in fixture: there is nothing to keep in step with the
migrations, and nothing that can go stale and start lying. It also makes the backfills free — with
zero rows there is nothing to embed — so the escape hatch that local development needs stops being
part of the test story.

**Rejected — a production snapshot as the seed.** It carries real emails, better-auth password
hashes, API key hashes and session tokens onto a dev machine, into a file that `git add -A` could
commit to a private repo. Every suite already signs up its own users, so the realism buys nothing
that matters. If a realistic corpus is ever wanted for performance work, that is a separate,
scrubbed artifact and not the default test path.

**Rejected — `:memory:`.** `setDb()` already supports injection for unit tests, but the integration
and e2e suites drive a real `nuxt dev` over HTTP in a separate process; an in-memory database in
the test process is invisible to it.

## D2 — The temp database goes on ext4, not on the repo mount

`/mnt/c` is `v9fs` (the Windows mount) and `/tmp` is ext4 on `/dev/sdc` with 934 GB free. Every
page a test touches on `/mnt/c` crosses the 9p boundary. The measurement that shows the cost most
plainly is `VACUUM` on the same data: **56 s** at 3.6 GB on v9fs, **2.8 s** at 159 MB on ext4 —
two variables at once, which is why this change moves the file _and_ keeps it empty rather than
claiming either one alone is the fix.

**A caution to keep with this, because it is the one thing already measured:** the dominant cost in
the CLI integration suites is **not** the database. `node cli/bin/aleph.js --version` takes
**4.2–4.6 s** on this checkout against vitest's 5000 ms per-test timeout, which is what produced 45
failures in which **not one assertion failed**. Moving the database will not fix those. Do not
report this change as fixing them.

## D3 — One resolver, imported by everything that opens the file

`resolveDbPath()` lives in `server/utils/db-path.ts` — its own module, with no `better-sqlite3`
import — so a test can read it without dragging the driver in. `ALEPH_DB_PATH`, when set, is used
verbatim; otherwise the result is byte-identical to today's `join(process.cwd(), 'data',
'aleph.db')`, and `mkdirSync` still runs on the parent directory.

This matters more than it looks. Two integration tests open the database themselves with the path
written out by hand (`admin-users.test.ts:8`, `backup-api.test.ts:10`). Left alone, they would read
the DEV database while the server under test read the temp one — two different databases in one
test run, with assertions that would keep passing. That is this codebase's recurring shape: a value
that is accepted and silently means something else.

## D4 — The variable is set by the runner, not defaulted to a temp path

`resolveDbPath()` does **not** guess that it is in a test. A default of "temp path when
`NODE_ENV=test`" would mean a stray `NODE_ENV` in a shell silently pointed a developer's `npm run
dev` at an empty database and looked like total data loss. The scripts set the variable
explicitly, and an unset variable always means the real database.

## D5 — Cleaning the dev database: empty the shadow tables, do not drop the virtual ones

Measured order of operations, because the intuitive one does nothing:

1. Deleting 1,729 test campaigns one at a time: 107 s, **14 MB reclaimed**, and **10 failures** —
   all campaigns named "Inv Test", which hit the `inventory_items → items` foreign key that is
   `NO ACTION`. (A _single_ campaign delete works, including a real one; it was the bulk `NOT IN`
   delete that failed. The API's own delete endpoint is fine.)
2. `VACUUM`: 56 s, **nothing** — `freelist_count` was already 0. The bloat is live pages.
3. Emptying the **eight** `entity_vectors*` shadow tables: **3.61 GB → 0.159 GB in 2.8 s**.

`DROP TABLE entity_vectors` fails with `no such module: vec0` from a plain `better-sqlite3`
connection — the extension is not loaded — so the two `vec0` virtual tables must be excluded by
name and only their shadow tables emptied. `initVecTable` then rebuilds on the next boot and the
embedding backfill repopulates, which is minutes of work and the reason this is a deliberate
one-off with the backfills enabled, not something to automate.

## D6 — Why production gets a number and not a job

Production: 171 MB, chunks 24 MB (14% of the file), 8 chunks, **55.4% slot occupancy**, freelist
0.4%. Healthy. `sqlite-vec` allocates 1,024 slots at a time, so 4,541 vectors need five chunks and
occupy eight; the slack is ~11 MB.

The pathology needs **churn**, and production has almost none: the dev database reached 0.67%
occupancy by creating and deleting 11,294 entities across 1,733 campaigns. The one thing that could
reproduce it in production is a bulk campaign import or delete, repeated. So the right instrument
is occupancy reported next to the vector-parity check that already runs at boot, with a manual
rebuild in a window if it ever drops below ~20% — event-triggered, not scheduled. See the
proposal's Non-Goals for why an hourly job is actively harmful.
