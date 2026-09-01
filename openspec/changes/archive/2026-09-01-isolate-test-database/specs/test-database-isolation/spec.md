## ADDED Requirements

### Requirement: The database path is configurable, and defaults to today's path

The system SHALL resolve its SQLite file through a single function, `resolveDbPath()`, which SHALL
return `process.env.ALEPH_DB_PATH` when that variable is set and non-empty, and otherwise
`join(process.cwd(), 'data', 'aleph.db')` — byte-identical to the current hardcoded value. The
parent directory SHALL be created if absent.

The resolver MUST NOT infer a test context. An unset `ALEPH_DB_PATH` SHALL always mean the real
database, whatever `NODE_ENV` says.

Every place that opens the database — the server and any test that opens it directly — SHALL use
this resolver rather than composing the path itself.

#### Scenario: production and local development are unchanged

- **GIVEN** `ALEPH_DB_PATH` is unset
- **WHEN** the server starts
- **THEN** it opens `<cwd>/data/aleph.db`

#### Scenario: the variable redirects the server

- **GIVEN** `ALEPH_DB_PATH` is set to a path that does not exist
- **WHEN** the server starts
- **THEN** it creates the file and its parent directory, applies every migration, and serves

#### Scenario: NODE_ENV alone never redirects the database

- **GIVEN** `NODE_ENV=test` and `ALEPH_DB_PATH` unset
- **WHEN** the database path is resolved
- **THEN** it is the real `data/aleph.db`

#### Scenario: a test that opens the database reads the same file as the server

- **GIVEN** a test run with `ALEPH_DB_PATH` set
- **WHEN** an integration test opens the database directly
- **THEN** it opens the same file the server opened, not `data/aleph.db`

### Requirement: Each test run uses a fresh, empty database outside the repository

`npm run test:integration`, `npm run test:e2e` and `npm run test:all` SHALL each create a new,
empty database file under the system temporary directory, point `ALEPH_DB_PATH` at it, run the
suite, and delete it afterwards — including its `-wal` and `-shm` siblings.

The file SHALL NOT be created inside the repository working tree, and no test run SHALL write to
`data/aleph.db`.

No seed fixture is required: an empty file is a complete starting state, because the boot plugins
apply the migrations and initialise the lexical and vector indexes unconditionally.

Deletion SHALL happen even when the suite fails, so a red run does not leave the file behind.

#### Scenario: the development database is untouched by a test run

- **GIVEN** `data/aleph.db` with a known size and campaign count
- **WHEN** the integration suite runs to completion
- **THEN** its size and campaign count are unchanged
- **AND** no campaign created by the suite exists in it

#### Scenario: two consecutive runs do not accumulate

- **WHEN** the integration suite runs twice
- **THEN** the second run starts from an empty database
- **AND** neither temporary file survives

#### Scenario: a failed run still cleans up

- **GIVEN** a suite that exits non-zero
- **WHEN** the run finishes
- **THEN** the temporary database and its `-wal`/`-shm` siblings are gone
- **AND** the runner's exit code is the suite's, not the cleanup's

#### Scenario: an empty database is a sufficient seed

- **GIVEN** a freshly created empty file
- **WHEN** the server boots against it and the integration suite runs
- **THEN** the suite passes without any fixture being loaded

### Requirement: The development database is reduced and stays reduced

The development database SHALL be reduced from its bloated state to approximately its live-data
size, by emptying the `sqlite-vec` shadow tables and vacuuming — not by deleting rows, which
reclaims 0.4%.

The two `vec0` virtual tables MUST be excluded from that operation by name: `DROP TABLE` and
`DELETE FROM` against them fail with `no such module: vec0` on a connection without the extension
loaded.

After the reduction the vector index SHALL be rebuilt by the existing boot-time initialisation and
backfill, and semantic search SHALL work as before.

#### Scenario: the reduction reclaims the chunks

- **GIVEN** a database whose vector slot occupancy is under 1%
- **WHEN** the shadow tables are emptied and the file vacuumed
- **THEN** the file is reduced to approximately its live-data size
- **AND** the four real campaigns and all their entities are intact

#### Scenario: search still works afterwards

- **GIVEN** the reduced database
- **WHEN** the server boots with the startup backfills enabled and finishes them
- **THEN** semantic search returns results again
