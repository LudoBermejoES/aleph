## Why

The integration and e2e suites run against the development database, and they never clean up. The
result, measured on 2026-08-31:

|                               | this checkout                           | production |
| ----------------------------- | --------------------------------------- | ---------- |
| `data/aleph.db`               | **3.62 GB**                             | **171 MB** |
| campaigns                     | **1,733** (4 real, 1,729 left by tests) | 4          |
| `sqlite-vec` chunks allocated | **1,165**                               | 8          |
| vector slot occupancy         | **0.67%**                               | 55.4%      |

Same four real campaigns, twenty times the file. And the obvious cleanup does not work: deleting
all 1,729 throwaway campaigns one by one took 107 s and reclaimed **14 MB** — 0.4%. Emptying the
eight `sqlite-vec` shadow tables reclaimed **3.45 GB** and took 2.8 s. **97% of the file is vector
chunks**, which `sqlite-vec` allocates 1,024 slots at a time and never frees on delete. Every test
run that creates entities allocates more, so the growth is monotonic and no amount of row deletion
undoes it.

The costs are not only disk:

- **A whole-file operation collapses.** `VACUUM` took **56 s** on the 3.6 GB file and **2.8 s** on
  the same data at 159 MB. `VACUUM INTO` to take a consistent snapshot took **351 s**.
- **The file lives on the slow mount.** `/mnt/c` is `v9fs`; `/tmp` is ext4 on `/dev/sdc`. Every
  page the tests touch crosses the 9p boundary.
- **Tests are not reproducible.** A count of multi-image entities gave 150, then 170, then 190
  across one afternoon _while the suite ran_, because the query was measuring the suite's own
  fixtures. Two agents reported different numbers for the same question on the same day, and both
  were reading real rows.

A production snapshot was considered as the seed and **rejected**: production holds real user
emails, better-auth password hashes, API key hashes and session tokens, and a seed file one
`git add -A` away from a private repo is not worth the realism. It is also unnecessary — every
suite signs up its own users and creates its own campaigns.

## What Changes

- **The database path becomes configurable.** `server/utils/db.ts` hardcodes
  `join(process.cwd(), 'data', 'aleph.db')`. A new `resolveDbPath()` honours `ALEPH_DB_PATH`,
  falling back to exactly today's path, so nothing changes for `npm run dev` or production.
- **Each test run gets a fresh, empty database on ext4.** The boot plugins already apply the
  Drizzle migrations and run `initFTS5`/`initVecTable` unconditionally, so an **empty file is a
  complete seed**: no fixture to maintain, nothing to go stale. And with no rows there is nothing
  to backfill, so the startup backfills cost nothing and `STARTUP_BACKFILLS_ENABLED` stops
  mattering for tests.
- **The two integration tests that open the database directly** — `admin-users.test.ts:8` and
  `backup-api.test.ts:10`, both with the path hardcoded — read the same resolver. Without this
  they would open the DEV database while the server used the temp one, and pass or fail for a
  reason unrelated to the code.
- **`test:integration`, `test:e2e` and `test:all`** create the temp database, export the variable,
  run, and delete it.
- **The development database is cleaned once**, in place, from 3.62 GB to ~160 MB.

## Non-Goals

- **No hourly vector-index consolidation in production, and this change argues against one.**
  Production sits at 55.4% slot occupancy with 24 MB of chunks; the absolute ceiling of what a
  compaction could reclaim there today is ~11 MB of a 171 MB file. `sqlite-vec` has no compaction
  operation — the only way to reclaim is to rebuild the index, i.e. **re-embed every entity**,
  which is the exact operation `fix-dev-boot-native-addon` exists because it held a live site at
  HTTP 500 for over a minute. An hourly job would take the site down hourly to save 6% of a small
  file. What belongs in production is a **health number**, not a job: report slot occupancy
  alongside the vector-parity check that already runs at boot, and rebuild by hand in a window if
  it ever falls below ~20%. The trigger is an event (a bulk campaign import or delete), not a clock.
- Not moving the development database off `/mnt/c`. Only the throwaway test copies go to ext4.
- Not changing what the suites test, nor adding fixtures.
- Not touching `content/`: 4,642 files but **228 KB**, so it accumulates file count, not size.

## Impact

- Affected specs: `test-database-isolation` (new capability)
- Affected code: `server/utils/db.ts`, new `server/utils/db-path.ts`,
  `tests/integration/{admin-users,backup-api}.test.ts`, `package.json` scripts, a new script under
  `scripts/`, `playwright.config.ts`, `.env.example`, `docs/development.md`, `CLAUDE.md`
- Migrations: none.
- **aleph-cli**: no impact. The CLI talks HTTP and never opens the database.
