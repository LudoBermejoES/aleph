import { eq, isNotNull, sql } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { randomUUID } from 'crypto'
import { access, copyFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { campaigns } from '../schema/campaigns'
import { organizations } from '../schema/organizations'
import { entityImages } from '../schema/entity-images'
import { orgGalleryDir, orgGalleryImageUrl } from '../../services/entity-images'
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
 * Give every organization that already had a single `organizations.imageUrl` a primary gallery
 * image, so nothing visible before this change disappears after it.
 *
 * Idempotent — an organization that already has gallery rows is skipped. Copies, never moves.
 */
export async function backfillOrganizationImages(
  db: BetterSQLite3Database,
): Promise<BackfillResult> {
  const result: BackfillResult = { migrated: 0, skippedExisting: 0, skippedMissingFile: 0 }

  const rows = db
    .select({
      id: organizations.id,
      entityId: organizations.entityId,
      campaignId: organizations.campaignId,
      slug: organizations.slug,
      imageUrl: organizations.imageUrl,
      contentDir: campaigns.contentDir,
    })
    .from(organizations)
    .innerJoin(campaigns, eq(organizations.campaignId, campaigns.id))
    .where(isNotNull(organizations.imageUrl))
    .all()

  for (const row of rows) {
    if (!row.entityId) continue

    const already = db
      .select({ count: sql<number>`COUNT(*)` })
      .from(entityImages)
      .where(eq(entityImages.entityId, row.entityId))
      .get()
    if ((already?.count ?? 0) > 0) {
      result.skippedExisting++
      continue
    }

    const legacyDir = join(process.cwd(), row.contentDir, 'organizations', row.slug)
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
    const destDir = orgGalleryDir(row.contentDir, row.slug)
    const dest = join(destDir, filename)

    try {
      await mkdir(destDir, { recursive: true })
      if (!(await exists(dest))) {
        await copyFile(source, dest)
      }
    } catch (err) {
      logger.warn(`[backfill] could not copy organization image for ${row.slug}`, {
        error: String(err),
      })
      result.skippedMissingFile++
      continue
    }

    const url = orgGalleryImageUrl(row.campaignId, row.slug, imageId)

    // Need a userId for createdBy; use a system sentinel or the org creator if available.
    const createdBy =
      db
        .select({ createdBy: campaigns.createdBy })
        .from(campaigns)
        .where(eq(campaigns.id, row.campaignId))
        .get()?.createdBy ?? 'system'

    db.transaction((tx) => {
      tx.insert(entityImages)
        .values({
          id: imageId,
          campaignId: row.campaignId,
          entityId: row.entityId!,
          filename,
          url,
          caption: null,
          sortOrder: 0,
          isPrimary: true,
          createdBy,
          createdAt: new Date(),
        })
        .run()
      tx.update(organizations).set({ imageUrl: url }).where(eq(organizations.id, row.id)).run()
    })

    result.migrated++
  }

  return result
}
