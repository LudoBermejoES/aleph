# Daily Backup — Cloudflare R2

Aleph backs up the SQLite database, campaign content directory, and `.env` file as compressed tar.gz archives to a Cloudflare R2 bucket. Backups run automatically at **03:00 UTC daily** via a Nitro scheduled task.

## How It Works

1. `better-sqlite3.backup()` creates a safe, atomic snapshot of the database (handles WAL mode, no downtime)
2. The snapshot + `content/` directory + `.env` are archived into a `.tar.gz` file
3. The archive is uploaded to Cloudflare R2 via the S3-compatible API (`@aws-sdk/client-s3`)
4. A retention policy deletes old archives: **7 daily, 4 weekly, 6 monthly** are kept

## Setup

### 1. Create an R2 Bucket

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **R2 Object Storage**
2. Click **Create bucket**, name it (e.g., `aleph`)
3. Note your **Account ID** from the R2 overview page

### 2. Create an API Token

1. In R2, go to **Manage R2 API Tokens** → **Create API token**
2. Set permissions to **Object Read & Write**
3. Scope it to your bucket only
4. Copy the **Access Key ID** and **Secret Access Key** (shown only once)

### 3. Configure Environment Variables

Add these to your server's `.env` file:

```env
NUXT_BACKUP_R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
NUXT_BACKUP_R2_ACCESS_KEY_ID=<your-access-key-id>
NUXT_BACKUP_R2_SECRET_ACCESS_KEY=<your-secret-access-key>
NUXT_BACKUP_R2_BUCKET=aleph
```

If deploying via GitHub Actions, add these as repository secrets (`BACKUP_R2_ENDPOINT`, etc.) and inject them into the `.env` during deployment.

### 4. Restart the Server

The scheduled task will run at 03:00 UTC the next day. To verify immediately, trigger a manual backup.

## Manual Operations

### Trigger a Backup

```bash
# Via API (requires authentication)
curl -X POST https://aleph.example.com/api/admin/backup \
  -H "X-API-Key: <your-api-key>"

# Via aleph-cli (if configured)
aleph backup run
```

### List Backups

```bash
curl https://aleph.example.com/api/admin/backup \
  -H "X-API-Key: <your-api-key>"
```

Returns:

```json
{
  "configured": true,
  "archives": [
    { "key": "backups/aleph-2026-04-10T03-00-00-000Z.tar.gz", "sizeMB": 245.3, "lastModified": "2026-04-10T03:01:23.000Z" },
    ...
  ]
}
```

### Restore from Backup

```bash
# Restore latest
curl -X POST https://aleph.example.com/api/admin/backup/restore \
  -H "X-API-Key: <your-api-key>" \
  -H "Content-Type: application/json" \
  -d '{}'

# Restore a specific archive
curl -X POST https://aleph.example.com/api/admin/backup/restore \
  -H "X-API-Key: <your-api-key>" \
  -H "Content-Type: application/json" \
  -d '{"key": "backups/aleph-2026-04-10T03-00-00-000Z.tar.gz"}'
```

After a restore, **restart the server** to pick up the restored database.

A pre-restore backup of the current data is saved at `data/.pre-restore-backup/` so the restore itself is reversible.

## Retention Policy

Only the **3 most recent** backup archives are kept. After each backup, any older archives are automatically deleted from R2.

Worst-case storage usage with ~400 MB archives: ~1.2 GB (well within R2's 10 GB free tier).

## Migrating to a Different Backend

The backup service uses the S3-compatible API. To switch to another S3 provider (Backblaze B2, AWS S3, MinIO):

1. Change `NUXT_BACKUP_R2_ENDPOINT` to the new provider's S3 endpoint
2. Update the access key and secret
3. Update the bucket name
4. No code changes needed

## Troubleshooting

- **Backup skipped**: Check that all `NUXT_BACKUP_*` env vars are set. The task logs `R2 not configured, skipping` if any are missing.
- **Upload failures**: Check server logs (`logs/combined-*.log`) for S3 errors. Common causes: expired credentials, bucket permissions, network issues.
- **Large archives**: Monitor archive sizes via the list endpoint. If content grows past ~8 GB, consider upgrading to paid R2 ($0.015/GB/month) or purging unused map tiles.
