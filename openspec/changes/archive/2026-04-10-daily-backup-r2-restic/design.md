## Context

Aleph runs as a single PM2/Nitro process on a Linux VPS. Data lives in two places: a SQLite database at `data/aleph.db` (WAL mode, ~4 MB) and a content directory at `content/campaigns/` (~931 MB of markdown, images, map tiles). The only existing backup is a local copy made during deploys (last 3 kept on the same disk). Nitro already has experimental task support enabled (`experimental: { tasks: true }`) with two existing tasks (`maps:tile`, `maps:retile-all`). The `better-sqlite3` instance is exported from `server/db/index.ts` and exposes `.backup(path)` for safe snapshots.

## Goals / Non-Goals

**Goals:**

- Pure Node.js — no shell scripts, no restic/sqlite3 CLI, no system cron
- Automated nightly off-site backup of all critical data (DB, content, .env)
- Safe SQLite snapshots via `better-sqlite3.backup()` (handles WAL correctly without stopping the app)
- Upload compressed tar.gz archives to Cloudflare R2 via `@aws-sdk/client-s3`
- Retention policy: keep 3 most recent archives, delete older ones
- Admin API endpoints to trigger backup, list backups, and restore — no SSH needed
- Nitro `scheduledTasks` for cron (runs inside the app process)
- Documented setup

**Non-Goals:**

- Block-level deduplication (tar.gz archives are simpler; R2's 10 GB free tier is sufficient)
- Real-time replication or point-in-time recovery
- Backup of logs (non-critical, rotated locally)
- Backup of application code (already in GitHub)
- Multi-server or multi-region backup
- Client-side encryption (R2 provides encryption at rest; adding client-side would prevent inspecting archives)

## Decisions

### 1. Nitro scheduled tasks over system cron or node-cron

**Decision**: Use Nitro's built-in `scheduledTasks` in `nuxt.config.ts` to schedule `backup:run` at `0 3 * * *`.

**Why**: Nitro tasks are already enabled and used in this project (`maps:tile`). No external scheduler, no shell, no extra dependency. The task runs inside the app process with access to all server utilities (DB, logger, config).

**Alternatives considered**:

- _System cron + shell script_: Requires SSH access to install, separate language (bash), can't access the Nitro runtime.
- _node-cron package_: Extra dependency that duplicates Nitro's built-in capability.

### 2. better-sqlite3.backup() over sqlite3 CLI

**Decision**: Use the `sqlite` instance from `server/db/index.ts` and call `.backup(stagingPath)` directly.

**Why**: Already available — `better-sqlite3` exposes SQLite's online backup API as an async method. Produces a consistent snapshot without stopping writes, without shelling out, without requiring `sqlite3` to be installed on the server.

### 3. tar.gz archives over restic/dedup

**Decision**: Archive DB + content + .env into a single `.tar.gz` file per backup, upload to R2 with a date-based key (`backups/aleph-2026-04-10T03:00:00Z.tar.gz`).

**Why**: Simpler than restic. No deduplication means each archive is a full ~200-400 MB (content is mostly images which compress poorly, but the DB and markdown compress well). With retention (3 archives), worst case is ~1.2 GB — fits easily within R2's 10 GB free tier. If data grows past that, R2 costs $0.015/GB/month.

**Alternatives considered**:

- _Restic_: Excellent deduplication, but it's a Go binary — can't be called from Node without shelling out. Defeats the "pure Node" goal.
- _Incremental tar_: Complex to manage, fragile, and not worth it at this data size.

### 4. @aws-sdk/client-s3 + @aws-sdk/lib-storage for R2 uploads

**Decision**: Use the official AWS SDK v3 for S3-compatible operations. `@aws-sdk/lib-storage` handles multipart upload automatically for large archives.

**Why**: R2 is fully S3-compatible. The SDK is well-maintained, handles retries, multipart chunking, and streaming. No need for a Cloudflare-specific SDK.

### 5. Retention via S3 object listing + deletion

**Decision**: After each backup, list all objects with the `backups/` prefix, sort by date, keep only the 3 most recent, delete extras with `DeleteObjectsCommand`.

**Why**: Simple and self-contained. R2 has lifecycle rules but they only support age-based deletion (not "keep 4 weekly"). Doing it in code gives precise control.

### 6. Admin API endpoints for manual control

**Decision**: Add `POST /api/admin/backup` (trigger), `GET /api/admin/backup` (list snapshots), `POST /api/admin/backup/restore` (restore a specific archive). Protected so only the system admin can access them.

**Why**: Enables triggering backups and restores from the browser or CLI without SSH. The scheduled task handles the daily run, but manual control is essential for testing and emergencies.

### 7. Shared backup service module

**Decision**: Create `server/services/backup.ts` with the S3 client, archive/upload/download/extract/retention logic. Tasks and API routes call this service.

**Why**: DRY — the backup, restore, and check tasks all need S3 access and archive handling. A shared service avoids duplication.

## Risks / Trade-offs

- **No deduplication**: Each archive is a full copy (~200-400 MB). With 17 retained archives, that's ~3.4-6.8 GB. [Risk: low] → R2 free tier is 10 GB. Monitor with list endpoint. If data grows, paid R2 is $0.015/GB/month.
- **Archive creation blocks briefly**: `tar.create()` reading ~1 GB of files takes a few seconds. [Risk: low] → Runs at 03:00 UTC, non-blocking to the Nitro event loop (streaming tar), no user impact.
- **better-sqlite3.backup() during heavy writes**: The backup API is safe but may take longer if there are concurrent writes. [Risk: negligible] → 4 MB database, backup completes in milliseconds.
- **R2 free tier changes**: Cloudflare could modify pricing. [Risk: low] → Migration is trivial: change the S3 endpoint to B2, MinIO, or any S3-compatible service.
- **Nitro scheduledTasks is experimental**: API could change. [Risk: low] → It's a one-line config. If it changes, adaptation is minimal.
- **Large upload failure**: A 400 MB upload could fail partway. [Risk: low] → `@aws-sdk/lib-storage` uses multipart upload with automatic retries.
