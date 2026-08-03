import { and, eq, isNotNull, sql } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { randomUUID } from 'crypto'
import { access, copyFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { campaigns } from '../schema/campaigns'
import { entities } from '../schema/entities'
import { entityImages } from '../schema/entity-images'
import { galleryDir, galleryImageUrl } from '../../services/entity-images'
import { logger } from '../../utils/logger'

const CANDIDATE_EXTS = ['.png', '.jpg', '.jpeg', '.webp']

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

export interface BackfillResult {
  migrated: number
  skippedExisting: number
  skippedMissingFile: number
}

/**
 * Give every location that already had a single `entities.imageUrl` a primary gallery image, so
 * nothing visible before this change disappears after it.
 *
 * This cannot live in the .sql migration: it copies files. It runs right after `migrate()` and is
 * idempotent — a location that already has gallery rows is skipped, and an existing destination
 * file is never overwritten. Copies, never moves: the old file stays readable.
 */
export async function backfillLocationImages(db: BetterSQLite3Database): Promise<BackfillResult> {
  const result: BackfillResult = { migrated: 0, skippedExisting: 0, skippedMissingFile: 0 }

  const rows = db
    .select({
      id: entities.id,
      campaignId: entities.campaignId,
      slug: entities.slug,
      imageUrl: entities.imageUrl,
      createdBy: entities.createdBy,
      contentDir: campaigns.contentDir,
    })
    .from(entities)
    .innerJoin(campaigns, eq(entities.campaignId, campaigns.id))
    .where(and(eq(entities.type, 'location'), isNotNull(entities.imageUrl)))
    .all()

  for (const row of rows) {
    const already = db
      .select({ count: sql<number>`COUNT(*)` })
      .from(entityImages)
      .where(eq(entityImages.entityId, row.id))
      .get()
    if ((already?.count ?? 0) > 0) {
      result.skippedExisting++
      continue
    }

    const legacyDir = join(process.cwd(), row.contentDir, 'entities', row.slug)
    let source: string | null = null
    let ext = '.png'
    for (const candidate of CANDIDATE_EXTS) {
      if (await exists(join(legacyDir, `image${candidate}`))) {
        source = join(legacyDir, `image${candidate}`)
        ext = candidate
        break
      }
    }

    if (!source) {
      result.skippedMissingFile++
      continue
    }

    const imageId = randomUUID()
    const filename = `${imageId}${ext}`
    const destDir = galleryDir(row.contentDir, row.slug)
    const dest = join(destDir, filename)

    try {
      await mkdir(destDir, { recursive: true })
      if (!(await exists(dest))) {
        await copyFile(source, dest)
      }
    } catch (err) {
      logger.warn(`[backfill] could not copy location image for ${row.slug}`, {
        error: String(err),
      })
      result.skippedMissingFile++
      continue
    }

    const url = galleryImageUrl(row.campaignId, row.slug, imageId)

    db.transaction((tx) => {
      tx.insert(entityImages)
        .values({
          id: imageId,
          campaignId: row.campaignId,
          entityId: row.id,
          filename,
          url,
          caption: null,
          sortOrder: 0,
          isPrimary: true,
          createdBy: row.createdBy,
          createdAt: new Date(),
        })
        .run()
      tx.update(entities).set({ imageUrl: url }).where(eq(entities.id, row.id)).run()
    })

    result.migrated++
  }

  return result
}
