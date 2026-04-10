import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { createReadStream, createWriteStream } from 'fs'
import { mkdir, cp, stat } from 'fs/promises'
import { join, resolve } from 'path'
import { pipeline } from 'stream/promises'
import type { Readable } from 'stream'
import * as tar from 'tar'
import { sqlite } from '../db/index'
import { logger } from '../utils/logger'

const BACKUP_PREFIX = 'backups/'
const DEPLOY_PATH = process.cwd()

interface BackupConfig {
  r2Endpoint: string
  r2AccessKeyId: string
  r2SecretAccessKey: string
  r2Bucket: string
}

export interface BackupArchive {
  key: string
  size: number
  lastModified: Date
}

function getConfig(): BackupConfig {
  const config = useRuntimeConfig() as unknown as { backup: BackupConfig }
  return config.backup
}

function isConfigured(): boolean {
  const c = getConfig()
  return !!(c.r2Endpoint && c.r2AccessKeyId && c.r2SecretAccessKey && c.r2Bucket)
}

function getS3Client(): S3Client {
  const c = getConfig()
  return new S3Client({
    region: 'auto',
    endpoint: c.r2Endpoint,
    credentials: {
      accessKeyId: c.r2AccessKeyId,
      secretAccessKey: c.r2SecretAccessKey,
    },
  })
}

/**
 * Create a tar.gz archive of the database snapshot, content dir, and .env
 */
export async function createBackupArchive(stagingDir: string): Promise<string> {
  await mkdir(stagingDir, { recursive: true })

  // Safe SQLite snapshot via better-sqlite3 backup API
  const dbStagingPath = join(stagingDir, 'aleph.db')
  await sqlite.backup(dbStagingPath)
  logger.info('backup: database snapshot created')

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const archivePath = join(stagingDir, `aleph-${timestamp}.tar.gz`)

  const entries: string[] = ['aleph.db']

  // Include content directory if it exists
  const contentPath = join(DEPLOY_PATH, 'content')
  try {
    await stat(contentPath)
    // Copy content to staging so tar paths are relative
    await cp(contentPath, join(stagingDir, 'content'), { recursive: true })
    entries.push('content')
  } catch {
    logger.warn('backup: content directory not found, skipping')
  }

  // Include .env if it exists
  const envPath = join(DEPLOY_PATH, '.env')
  try {
    await stat(envPath)
    await cp(envPath, join(stagingDir, '.env'))
    entries.push('.env')
  } catch {
    logger.warn('backup: .env file not found, skipping')
  }

  await tar.create({ gzip: true, file: archivePath, cwd: stagingDir }, entries)

  logger.info('backup: archive created', { archivePath, entries })
  return archivePath
}

/**
 * Upload an archive to R2
 */
export async function uploadArchive(archivePath: string, key: string): Promise<void> {
  if (!isConfigured()) throw new Error('Backup R2 credentials not configured')

  const c = getConfig()
  const s3 = getS3Client()
  const body = createReadStream(archivePath)

  const upload = new Upload({
    client: s3,
    params: {
      Bucket: c.r2Bucket,
      Key: key,
      Body: body,
      ContentType: 'application/gzip',
    },
  })

  await upload.done()
  logger.info('backup: archive uploaded', { key })
}

/**
 * Download an archive from R2
 */
export async function downloadArchive(key: string, destPath: string): Promise<void> {
  if (!isConfigured()) throw new Error('Backup R2 credentials not configured')

  const c = getConfig()
  const s3 = getS3Client()

  const response = await s3.send(
    new GetObjectCommand({
      Bucket: c.r2Bucket,
      Key: key,
    }),
  )

  if (!response.Body) throw new Error(`Empty response for key: ${key}`)

  const dir = resolve(destPath, '..')
  await mkdir(dir, { recursive: true })

  const writeStream = createWriteStream(destPath)
  await pipeline(response.Body as Readable, writeStream)
  logger.info('backup: archive downloaded', { key, destPath })
}

/**
 * List all backup archives in R2
 */
export async function listArchives(): Promise<BackupArchive[]> {
  if (!isConfigured()) return []

  const c = getConfig()
  const s3 = getS3Client()

  const response = await s3.send(
    new ListObjectsV2Command({
      Bucket: c.r2Bucket,
      Prefix: BACKUP_PREFIX,
    }),
  )

  return (response.Contents ?? [])
    .filter((obj) => obj.Key && obj.Key.endsWith('.tar.gz'))
    .map((obj) => ({
      key: obj.Key!,
      size: obj.Size ?? 0,
      lastModified: obj.LastModified ?? new Date(0),
    }))
    .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
}

/**
 * Get the key of the latest archive
 */
export async function getLatestArchiveKey(): Promise<string | null> {
  const archives = await listArchives()
  return archives.length > 0 ? archives[0].key : null
}

/**
 * Extract a backup archive to a destination directory
 */
export async function extractArchive(archivePath: string, destDir: string): Promise<void> {
  await mkdir(destDir, { recursive: true })
  await tar.extract({ file: archivePath, cwd: destDir })
  logger.info('backup: archive extracted', { archivePath, destDir })
}

/**
 * Apply retention policy: keep only the N most recent archives.
 * Returns the keys that were kept and pruned.
 */
export function selectArchivesToKeep(
  archives: BackupArchive[],
  maxCopies: number = 3,
): { kept: string[]; pruned: string[] } {
  const sorted = [...archives].sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
  const kept = sorted.slice(0, maxCopies).map((a) => a.key)
  const pruned = sorted.slice(maxCopies).map((a) => a.key)
  return { kept, pruned }
}

/**
 * Apply retention: delete pruned archives from R2
 */
export async function applyRetention(): Promise<string[]> {
  const archives = await listArchives()
  const { pruned } = selectArchivesToKeep(archives)

  if (pruned.length === 0) return []

  const c = getConfig()
  const s3 = getS3Client()

  await s3.send(
    new DeleteObjectsCommand({
      Bucket: c.r2Bucket,
      Delete: {
        Objects: pruned.map((key) => ({ Key: key })),
      },
    }),
  )

  logger.info('backup: retention applied', { deleted: pruned.length, keys: pruned })
  return pruned
}

/**
 * Generate the R2 key for a new backup
 */
export function generateBackupKey(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  return `${BACKUP_PREFIX}aleph-${timestamp}.tar.gz`
}

/**
 * Check if backup is configured
 */
export { isConfigured as isBackupConfigured }
