## ADDED Requirements

### Requirement: Safe SQLite snapshot before backup

The backup service SHALL create a consistent SQLite snapshot using `better-sqlite3.backup()` before archiving, so that WAL-mode databases are captured atomically without stopping the application.

#### Scenario: Backup while application is running

- **GIVEN** the Nitro server is running and actively writing to the database
- **WHEN** the backup task executes
- **THEN** it SHALL produce a consistent SQLite snapshot at a temporary staging path
- **AND** the application SHALL NOT be stopped or interrupted

#### Scenario: Database file does not exist

- **GIVEN** `data/aleph.db` does not exist at the configured path
- **WHEN** the backup task executes
- **THEN** it SHALL fail with an error logged and a non-success result

### Requirement: Compressed archive upload to Cloudflare R2

The backup service SHALL create a tar.gz archive containing the SQLite snapshot, the content directory, and the `.env` file, then upload it to a Cloudflare R2 bucket via the S3-compatible API.

#### Scenario: Successful daily backup

- **WHEN** the backup task runs with valid R2 credentials
- **THEN** it SHALL upload an archive to R2 with a date-based key (e.g., `backups/aleph-2026-04-10T03:00:00Z.tar.gz`)
- **AND** the archive SHALL contain `aleph.db`, `content/`, and `.env`

#### Scenario: Missing R2 credentials

- **WHEN** the backup task runs without R2 credentials configured in runtime config
- **THEN** it SHALL fail with a descriptive error and not attempt the upload

#### Scenario: Upload failure

- **WHEN** the R2 endpoint is unreachable or returns an error
- **THEN** the backup task SHALL fail and log the error

### Requirement: Retention policy

The backup service SHALL enforce a retention policy after each successful backup: keep only the 3 most recent archives, deleting all others from R2.

#### Scenario: Retention after 10 consecutive daily backups

- **GIVEN** 10 daily archives exist in the R2 bucket
- **WHEN** the retention policy runs
- **THEN** the bucket SHALL contain exactly 3 archives (the 3 most recent)
- **AND** all 7 older archives SHALL be deleted

### Requirement: Restore from archive

The restore task SHALL download an archive from R2 and replace the current database and content directory.

#### Scenario: Restore from latest archive

- **WHEN** the restore task is run without a specific key
- **THEN** it SHALL download the most recent archive from R2, extract it, replace `data/aleph.db`, `content/`, and `.env`

#### Scenario: Restore from a specific archive

- **WHEN** the restore task is run with a specific archive key
- **THEN** it SHALL download and restore that specific archive

#### Scenario: Pre-restore safety backup

- **WHEN** the restore task runs
- **THEN** it SHALL create a local backup of the current `data/` and `content/` before overwriting, so the restore itself is reversible

### Requirement: Backup health check

The check task SHALL verify that the most recent backup is fresh.

#### Scenario: Healthy backup

- **GIVEN** a backup completed successfully within the last 36 hours
- **WHEN** the check task runs
- **THEN** it SHALL return a success result with the latest archive timestamp

#### Scenario: Stale backup

- **GIVEN** no backup has completed in the last 36 hours
- **WHEN** the check task runs
- **THEN** it SHALL return a failure result with the age of the last archive

### Requirement: Nitro scheduled task

The backup task SHALL be scheduled to run daily at 03:00 UTC via Nitro's `scheduledTasks` configuration.

#### Scenario: Scheduled execution

- **GIVEN** the server is running with R2 credentials configured
- **WHEN** 03:00 UTC is reached
- **THEN** the `backup:run` task SHALL execute automatically

### Requirement: Admin API endpoints

Admin API endpoints SHALL allow triggering backups, listing archives, and restoring — accessible only to authenticated admin users.

#### Scenario: Trigger manual backup

- **GIVEN** an authenticated admin user
- **WHEN** `POST /api/admin/backup` is called
- **THEN** the backup task SHALL execute and return the result

#### Scenario: List backups

- **GIVEN** an authenticated admin user
- **WHEN** `GET /api/admin/backup` is called
- **THEN** it SHALL return a list of available archives with their keys, sizes, and timestamps

#### Scenario: Restore via API

- **GIVEN** an authenticated admin user
- **WHEN** `POST /api/admin/backup/restore` is called with an archive key
- **THEN** the restore task SHALL execute for that archive

#### Scenario: Unauthenticated access denied

- **GIVEN** no authentication or a non-admin user
- **WHEN** any admin backup endpoint is called
- **THEN** it SHALL return 401 or 403
