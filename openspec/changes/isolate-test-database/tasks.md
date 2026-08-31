# Tasks

## 1. The resolver

- [ ] 1.1 New `server/utils/db-path.ts` exporting `resolveDbPath(env = process.env)`. No
      `better-sqlite3` import, so a test can use it without the driver.
- [ ] 1.2 `server/utils/db.ts` calls it. The default branch must produce the _same_ path as today —
      assert it in a test, do not eyeball it.
- [ ] 1.3 It must NOT read `NODE_ENV`. A stray `NODE_ENV=test` in a shell pointing `npm run dev` at
      an empty database would look exactly like total data loss (design D4).
- [ ] 1.4 Unit tests: unset → today's path; set → verbatim; empty string → today's path;
      `NODE_ENV=test` alone → today's path.

## 2. The two tests that open the database themselves

- [ ] 2.1 `tests/integration/admin-users.test.ts:8` and `tests/integration/backup-api.test.ts:10`
      both hardcode the path. Point both at the resolver.
- [ ] 2.2 **Mutation-check this specifically**: with the runner setting `ALEPH_DB_PATH`, revert one
      of them to the hardcoded path and require it to go RED. If it stays green, the test was never
      reading what it claimed to and the fix is not verified.

## 3. The runner

- [ ] 3.1 `scripts/with-test-db.mjs`: mint a unique path under the OS temp dir (ext4 here, NOT the
      repo — `/mnt/c` is v9fs), export `ALEPH_DB_PATH`, spawn the given command, then delete the file
      and its `-wal`/`-shm` siblings.
- [ ] 3.2 Clean up on failure and on signal, and exit with the CHILD's code, never the cleanup's.
- [ ] 3.3 Wire `test:integration`, `test:e2e` and `test:all`. Leave `test:unit` alone — it never
      starts a server.
- [ ] 3.4 `playwright.config.ts`'s `webServer.command` inherits the variable from the parent
      process; confirm that by measurement, since `reuseExistingServer: true` means a server already
      running on 3333 with the WRONG database would be silently reused. Decide and document what the
      runner does about a pre-existing server — reusing one pointed at `data/aleph.db` would defeat the
      whole change while every test passed.

## 4. Prove the isolation, do not assume it

- [ ] 4.1 Record `data/aleph.db`'s size and `SELECT COUNT(*) FROM campaigns` before a run, and
      assert both unchanged after. This is the acceptance test for the whole change.
- [ ] 4.2 Assert no campaign named by the suite's fixtures exists in `data/aleph.db` afterwards.
- [ ] 4.3 Run the integration suite twice and confirm the second starts empty and nothing survives.
- [ ] 4.4 Confirm an empty database needs no seed: full suite green against a fresh file.
- [ ] 4.5 Measure and report suite wall-clock before and after. **Do not claim it fixes the CLI
      timeouts** — those are `node` spawn cost on `/mnt/c` (4.2–4.6 s against a 5000 ms timeout), not
      the database (design D2).

## 5. Reduce the development database (one-off, after the above)

- [ ] 5.1 Take a `VACUUM INTO` backup first. It took **351 s** on the 3.6 GB file — budget for it.
- [ ] 5.2 Empty the eight `entity_vectors*` **shadow** tables, excluding the two `vec0` virtual
      tables by name (`DROP`/`DELETE` on those fails with `no such module: vec0`). Then `VACUUM`.
      Expect ~3.6 GB → ~0.16 GB in about 3 s.
- [ ] 5.3 Delete the stale `data/aleph-pruebas-1458.db` (773 MB) and its `-wal`/`-shm` if the owner
      confirms it is dead.
- [ ] 5.4 Optionally delete the leftover test campaigns — but report honestly that it reclaims
      **14 MB of 3.6 GB** and takes 107 s, and that 10 of them fail on the
      `inventory_items → items` foreign key.
- [ ] 5.5 Boot with the backfills ENABLED and let the vector index rebuild; confirm semantic search
      returns results. Expect minutes.
- [ ] 5.6 Re-measure size, chunk count and slot occupancy, and record them.

## 6. Docs

- [ ] 6.1 `.env.example`: `ALEPH_DB_PATH`, with the warning that unset means the real database.
- [ ] 6.2 `docs/development.md`: the variable, the runner, and how to reduce a bloated database.
- [ ] 6.3 `CLAUDE.md`: that the suites no longer touch `data/aleph.db`, and — the part that will
      save someone a day — that a row count over "the database" measures the test fixtures unless the
      campaign is named. Two agents got different answers to the same question on the same afternoon
      because of it.
- [ ] 6.4 Note in `docs/` that production needs **no** scheduled vector consolidation, with the
      occupancy figures and why rebuilding means re-embedding (design D6).

## 7. Method

- [ ] 7.1 `npm run format:check` (CI runs it BEFORE the tests and fails the job) and
      `npx eslint . --ext .ts,.vue,.tsx`.
- [ ] 7.2 A server route change is not hot-reloaded: restart between a mutation and its run.
- [ ] 7.3 Warm the pages before the first Playwright run, or discard it.
- [ ] 7.4 Do not commit or push. Hand back for review.
