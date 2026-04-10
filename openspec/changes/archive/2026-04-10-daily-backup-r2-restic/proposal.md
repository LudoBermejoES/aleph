## Why

Aleph currently only backs up data during deploys (local copy on the same server, last 3 kept). If the server disk fails, or data is corrupted between deploys, everything is lost — the SQLite database (~4 MB), campaign content/images (~931 MB), and configuration. A daily off-site backup to Cloudflare R2 provides disaster recovery. Using a pure Node.js approach (Nitro scheduled tasks + `@aws-sdk/client-s3` + `better-sqlite3.backup()`) keeps everything in the existing tech stack with no shell scripts or external CLI tools.

## What Changes

- Add a Nitro server task `backup:run` (`server/tasks/backup/run.ts`) — uses `better-sqlite3.backup()` for safe DB snapshot, `tar` to archive DB + content + `.env`, `@aws-sdk/client-s3` to upload the archive to Cloudflare R2. Enforces retention (keep only the 3 most recent copies) by listing and deleting old objects.
- Add a Nitro server task `backup:restore` (`server/tasks/backup/restore.ts`) — downloads a specific (or latest) archive from R2, extracts it, replaces current data.
- Add a Nitro server task `backup:check` (`server/tasks/backup/check.ts`) — verifies the latest backup exists and is less than 36 hours old.
- Add a Nitro scheduled task that runs `backup:run` daily at 03:00 UTC via `nitro.config` `scheduledTasks`.
- Add API endpoints `POST /api/admin/backup` (trigger), `GET /api/admin/backup` (list/status), `POST /api/admin/backup/restore` (restore) — protected by admin/DM role.
- Add npm dependencies: `@aws-sdk/client-s3`, `@aws-sdk/lib-storage`, `tar`.
- Add runtime config for R2 credentials (`NUXT_BACKUP_R2_ENDPOINT`, `NUXT_BACKUP_R2_ACCESS_KEY_ID`, `NUXT_BACKUP_R2_SECRET_ACCESS_KEY`, `NUXT_BACKUP_R2_BUCKET`, `NUXT_BACKUP_ENCRYPTION_KEY`).
- Document setup in `docs/backup.md`.

## Capabilities

### New Capabilities

- `daily-backup`: Automated daily off-site backup and restore for SQLite database, campaign content, and server configuration using Node.js + Cloudflare R2.

### Modified Capabilities

_(none — this is infrastructure-only, no API or data model changes)_

## Impact

- **New files**: `server/tasks/backup/run.ts`, `server/tasks/backup/restore.ts`, `server/tasks/backup/check.ts`, `server/services/backup.ts` (shared S3 client + helpers), `server/api/admin/backup/` (API routes), `docs/backup.md`
- **npm dependencies**: `@aws-sdk/client-s3`, `@aws-sdk/lib-storage`, `tar`
- **Runtime config**: New `NUXT_BACKUP_*` environment variables for R2 credentials
- **Nitro config**: Add `scheduledTasks` entry for daily backup
- **Server dependencies**: None — pure Node.js, no restic/sqlite3 CLI needed
- **CLI**: No impact — no public API or data model changes (admin endpoints are internal)
- **Existing deploy workflow**: No changes — the deploy-time backup is retained as a complementary safety net
