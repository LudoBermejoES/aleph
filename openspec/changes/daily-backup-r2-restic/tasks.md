## 1. Dependencies and Configuration

- [x] 1.1 Install npm dependencies: `@aws-sdk/client-s3`, `@aws-sdk/lib-storage`, `tar`
- [x] 1.2 Add R2 backup runtime config to `nuxt.config.ts` under `runtimeConfig`: `backupR2Endpoint`, `backupR2AccessKeyId`, `backupR2SecretAccessKey`, `backupR2Bucket`, `backupEncryptionKey` (all default to empty string)
- [x] 1.3 Add `NUXT_BACKUP_R2_ENDPOINT`, `NUXT_BACKUP_R2_ACCESS_KEY_ID`, `NUXT_BACKUP_R2_SECRET_ACCESS_KEY`, `NUXT_BACKUP_R2_BUCKET` to `.env.example` with comments

## 2. Backup Service

- [x] 2.1 Create `server/services/backup.ts` — shared module exporting: `getS3Client()` (configured from runtime config), `createBackupArchive(stagingDir): Promise<string>` (calls `sqlite.backup()`, then `tar.create()` on staged DB + content + .env, returns archive path), `uploadArchive(archivePath, key): Promise<void>` (multipart upload via `@aws-sdk/lib-storage`), `downloadArchive(key, destPath): Promise<void>`, `listArchives(): Promise<Array<{key, size, lastModified}>>`, `applyRetention(archives, keep): Promise<deletedKeys[]>` (implements 7-daily/4-weekly/6-monthly logic), `getLatestArchiveKey(): Promise<string|null>`
- [x] 2.2 Write unit tests for retention logic in `tests/unit/server/backup-retention.test.ts` — given N archives with various dates, verify correct ones are kept/pruned for the 7/4/6 policy

## 3. Nitro Tasks

- [x] 3.1 Create `server/tasks/backup/run.ts` — calls `createBackupArchive`, `uploadArchive`, `applyRetention`, cleans up staging. Logs progress via `logger`. Returns `{ result: 'ok', key, size }` or `{ result: 'error', message }`.
- [x] 3.2 Create `server/tasks/backup/restore.ts` — accepts optional `payload.key` (default: latest), creates a local pre-restore backup of current data/, content/, .env, then calls `downloadArchive`, extracts tar.gz over current data. Returns `{ result: 'ok', restoredKey }`.
- [x] 3.3 Create `server/tasks/backup/check.ts` — calls `listArchives`, finds the latest, checks if its `lastModified` is within 36 hours. Returns `{ result: 'ok', latestKey, age }` or `{ result: 'stale', latestKey, age }`.
- [x] 3.4 Add `scheduledTasks` to `nitro` config in `nuxt.config.ts`: `'0 3 * * *': ['backup:run']`

## 4. Admin API Endpoints

- [x] 4.1 Create `server/api/admin/backup/index.get.ts` — list archives (calls `listArchives()`), returns JSON array. Requires authenticated admin (DM role check).
- [x] 4.2 Create `server/api/admin/backup/index.post.ts` — trigger manual backup (runs `backup:run` task), returns result. Requires admin.
- [x] 4.3 Create `server/api/admin/backup/restore.post.ts` — accepts `{ key }` in body, runs `backup:restore` task with that key, returns result. Requires admin.

## 5. Testing

- [x] 5.1 Write integration tests in `tests/integration/backup-api.test.ts` — test 401 without auth, test 403 for non-admin, test GET/POST endpoints return expected shapes (mock S3 calls or use a test bucket)

## 6. Documentation

- [x] 6.1 Create `docs/backup.md` — document: R2 bucket creation, API token generation, environment variable setup, how the scheduled task works, how to trigger a manual backup via API or aleph-cli, how to restore, how to list backups, retention policy explanation, how to migrate to a different S3-compatible backend
