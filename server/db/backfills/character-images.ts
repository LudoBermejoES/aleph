import { eq, isNotNull, sql } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { randomUUID } from 'crypto'
import { access, copyFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { campaigns } from '../schema/campaigns'
import { entities } from '../schema/entities'
import { characters } from '../schema/characters'
import { entityImages } from '../schema/entity-images'
import { characterGalleryDir, characterGalleryImageUrl } from '../../services/entity-images'
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
 * Give every character that already had a single `characters.portraitUrl` a primary gallery
 * image, so nothing visible before this change disappears after it.
 *
 * Idempotent — a character that already has gallery rows is skipped. Copies, never moves.
 */
export async function backfillCharacterImages(db: BetterSQLite3Database): Promise<BackfillResult> {
  const result: BackfillResult = { migrated: 0, skippedExisting: 0, skippedMissingFile: 0 }

  const rows = db
    .select({
      entityId: characters.entityId,
      campaignId: entities.campaignId,
      slug: entities.slug,
      portraitUrl: characters.portraitUrl,
      createdBy: entities.createdBy,
      contentDir: campaigns.contentDir,
    })
    .from(characters)
    .innerJoin(entities, eq(characters.entityId, entities.id))
    .innerJoin(campaigns, eq(entities.campaignId, campaigns.id))
    .where(isNotNull(characters.portraitUrl))
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

    const legacyDir = join(process.cwd(), row.contentDir, 'characters', row.slug)
    let source: string | null = null
    let ext = '.png'
    for (const candidate of CANDIDATE_EXTS) {
      if (await exists(join(legacyDir, `portrait${candidate}`))) {
        source = join(legacyDir, `portrait${candidate}`)
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
    const destDir = characterGalleryDir(row.contentDir, row.slug)
    const dest = join(destDir, filename)

    try {
      await mkdir(destDir, { recursive: true })
      if (!(await exists(dest))) {
        await copyFile(source, dest)
      }
    } catch (err) {
      logger.warn(`[backfill] could not copy character portrait for ${row.slug}`, {
        error: String(err),
      })
      result.skippedMissingFile++
      continue
    }

    const url = characterGalleryImageUrl(row.campaignId, row.slug, imageId)

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
          createdBy: row.createdBy,
          createdAt: new Date(),
        })
        .run()
      tx.update(characters)
        .set({ portraitUrl: url })
        .where(eq(characters.entityId, row.entityId!))
        .run()
    })

    result.migrated++
  }

  return result
}
