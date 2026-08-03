import { and, asc, eq, max, sql } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { randomUUID } from 'crypto'
import { mkdir, unlink, writeFile } from 'fs/promises'
import { join } from 'path'
import { entities } from '../db/schema/entities'
import { entityImages } from '../db/schema/entity-images'
import { logger } from '../utils/logger'

export interface EntityImageDTO {
  id: string
  url: string
  filename: string
  caption: string | null
  sortOrder: number
  isPrimary: boolean
  createdAt: Date
}

type Db = BetterSQLite3Database

/** Directory holding a location's gallery files. */
export function galleryDir(contentDir: string, slug: string): string {
  return join(process.cwd(), contentDir, 'locations', slug, 'images')
}

/** The stable serve URL of a gallery image. Location slugs are immutable, so this never rots. */
export function galleryImageUrl(campaignId: string, slug: string, imageId: string): string {
  return `/api/campaigns/${campaignId}/locations/${slug}/images/${imageId}`
}

function toDTO(row: typeof entityImages.$inferSelect): EntityImageDTO {
  return {
    id: row.id,
    url: row.url,
    filename: row.filename,
    caption: row.caption ?? null,
    sortOrder: row.sortOrder,
    isPrimary: row.isPrimary,
    createdAt: row.createdAt,
  }
}

/** Gallery in display order: sortOrder ascending, createdAt as the deterministic tiebreak. */
export function listImages(db: Db, entityId: string): EntityImageDTO[] {
  return db
    .select()
    .from(entityImages)
    .where(eq(entityImages.entityId, entityId))
    .orderBy(asc(entityImages.sortOrder), asc(entityImages.createdAt))
    .all()
    .map(toDTO)
}

export function getImage(db: Db, entityId: string, imageId: string) {
  return db
    .select()
    .from(entityImages)
    .where(and(eq(entityImages.entityId, entityId), eq(entityImages.id, imageId)))
    .get()
}

/**
 * The ONLY writer of `entities.imageUrl` for entities that have a gallery.
 *
 * Keeps the column equal to the primary image's URL, or null when the gallery is empty, so that
 * every existing consumer (graph builder, export, map-pin popovers, search) shows the primary
 * without knowing galleries exist. Must be called inside the same transaction as the mutation
 * that changed the gallery.
 */
export function syncPrimaryImageUrl(db: Db, entityId: string): string | null {
  const primary = db
    .select({ url: entityImages.url })
    .from(entityImages)
    .where(and(eq(entityImages.entityId, entityId), eq(entityImages.isPrimary, true)))
    .get()

  const url = primary?.url ?? null
  db.update(entities).set({ imageUrl: url }).where(eq(entities.id, entityId)).run()
  return url
}

/** Clear every primary flag for the entity, then set it on the target. */
function setPrimaryRows(db: Db, entityId: string, imageId: string) {
  db.update(entityImages)
    .set({ isPrimary: false })
    .where(and(eq(entityImages.entityId, entityId), eq(entityImages.isPrimary, true)))
    .run()
  db.update(entityImages)
    .set({ isPrimary: true })
    .where(and(eq(entityImages.entityId, entityId), eq(entityImages.id, imageId)))
    .run()
}

export interface AddImageInput {
  campaignId: string
  entityId: string
  slug: string
  contentDir: string
  data: Buffer
  ext: string
  caption?: string | null
  userId: string
}

/**
 * Append an image to the gallery. The first image of an empty gallery becomes the primary.
 *
 * The file is written before the transaction (better-sqlite3 transactions are synchronous, so no
 * awaits may happen inside one) and unlinked again if the transaction fails — the row is the
 * truth, so a row without its file is the state worth preventing.
 */
export async function addImage(db: Db, input: AddImageInput): Promise<EntityImageDTO> {
  const imageId = randomUUID()
  const filename = `${imageId}${input.ext}`
  const dir = galleryDir(input.contentDir, input.slug)
  const filePath = join(dir, filename)

  await mkdir(dir, { recursive: true })
  await writeFile(filePath, input.data)

  try {
    return db.transaction((tx) => {
      const maxRow = tx
        .select({ value: max(entityImages.sortOrder) })
        .from(entityImages)
        .where(eq(entityImages.entityId, input.entityId))
        .get()
      const existingCount = tx
        .select({ count: sql<number>`COUNT(*)` })
        .from(entityImages)
        .where(eq(entityImages.entityId, input.entityId))
        .get()

      const isFirst = (existingCount?.count ?? 0) === 0
      const sortOrder = isFirst ? 0 : (maxRow?.value ?? -1) + 1

      const row = {
        id: imageId,
        campaignId: input.campaignId,
        entityId: input.entityId,
        filename,
        url: galleryImageUrl(input.campaignId, input.slug, imageId),
        caption: input.caption?.trim() ? input.caption.trim() : null,
        sortOrder,
        isPrimary: isFirst,
        createdBy: input.userId,
        createdAt: new Date(),
      }

      tx.insert(entityImages).values(row).run()
      syncPrimaryImageUrl(tx as unknown as Db, input.entityId)

      return toDTO(row as typeof entityImages.$inferSelect)
    })
  } catch (err) {
    await unlink(filePath).catch(() => {})
    throw err
  }
}

export interface UpdateImagePatch {
  caption?: string | null
  sortOrder?: number
  isPrimary?: boolean
}

/** Update caption / order / primary in one transaction. Returns null when the image is unknown. */
export function updateImage(
  db: Db,
  entityId: string,
  imageId: string,
  patch: UpdateImagePatch,
): EntityImageDTO | null {
  return db.transaction((tx) => {
    const existing = getImage(tx as unknown as Db, entityId, imageId)
    if (!existing) return null

    const fields: Partial<typeof entityImages.$inferInsert> = {}
    if (patch.caption !== undefined) {
      fields.caption = patch.caption && patch.caption.trim() ? patch.caption.trim() : null
    }
    if (patch.sortOrder !== undefined) fields.sortOrder = patch.sortOrder

    if (Object.keys(fields).length > 0) {
      tx.update(entityImages).set(fields).where(eq(entityImages.id, imageId)).run()
    }

    if (patch.isPrimary === true) {
      setPrimaryRows(tx as unknown as Db, entityId, imageId)
    }

    syncPrimaryImageUrl(tx as unknown as Db, entityId)

    return toDTO(getImage(tx as unknown as Db, entityId, imageId)!)
  })
}

export interface DeleteImageInput {
  entityId: string
  imageId: string
  slug: string
  contentDir: string
}

/**
 * Remove an image. When the deleted row was the primary, the lowest-sortOrder survivor is
 * promoted in the same transaction, so a non-empty gallery always has exactly one primary.
 *
 * A failed unlink is logged and swallowed: the row is the truth and a stale file is harmless,
 * whereas a 500 on delete is not.
 */
export async function deleteImage(db: Db, input: DeleteImageInput): Promise<boolean> {
  const result = db.transaction((tx) => {
    const existing = getImage(tx as unknown as Db, input.entityId, input.imageId)
    if (!existing) return null

    tx.delete(entityImages).where(eq(entityImages.id, input.imageId)).run()

    if (existing.isPrimary) {
      const next = tx
        .select()
        .from(entityImages)
        .where(eq(entityImages.entityId, input.entityId))
        .orderBy(asc(entityImages.sortOrder), asc(entityImages.createdAt))
        .get()
      if (next) setPrimaryRows(tx as unknown as Db, input.entityId, next.id)
    }

    syncPrimaryImageUrl(tx as unknown as Db, input.entityId)
    return existing
  })

  if (!result) return false

  const filePath = join(galleryDir(input.contentDir, input.slug), result.filename)
  try {
    await unlink(filePath)
  } catch (err) {
    logger.warn(`[entity-images] could not unlink ${filePath}`, { error: String(err) })
  }
  return true
}

/** True when the entity has at least one gallery image. */
export function hasImages(db: Db, entityId: string): boolean {
  const row = db
    .select({ count: sql<number>`COUNT(*)` })
    .from(entityImages)
    .where(eq(entityImages.entityId, entityId))
    .get()
  return (row?.count ?? 0) > 0
}
