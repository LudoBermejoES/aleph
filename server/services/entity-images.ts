import { and, asc, eq, max, sql } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { randomUUID } from 'crypto'
import { mkdir, unlink, writeFile } from 'fs/promises'
import { join } from 'path'
import { entities } from '../db/schema/entities'
import { entityImages } from '../db/schema/entity-images'
import { characters } from '../db/schema/characters'
import { organizations } from '../db/schema/organizations'
import { logger } from '../utils/logger'

export type EntityKind = 'location' | 'character' | 'organization'

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

/** The stable serve URL of a location gallery image. */
export function galleryImageUrl(campaignId: string, slug: string, imageId: string): string {
  return `/api/campaigns/${campaignId}/locations/${slug}/images/${imageId}`
}

export function characterGalleryDir(contentDir: string, slug: string): string {
  return join(process.cwd(), contentDir, 'characters', slug, 'images')
}

export function characterGalleryImageUrl(
  campaignId: string,
  slug: string,
  imageId: string,
): string {
  return `/api/campaigns/${campaignId}/characters/${slug}/images/${imageId}`
}

export function orgGalleryDir(contentDir: string, slug: string): string {
  return join(process.cwd(), contentDir, 'organizations', slug, 'images')
}

export function orgGalleryImageUrl(campaignId: string, slug: string, imageId: string): string {
  return `/api/campaigns/${campaignId}/organizations/${slug}/images/${imageId}`
}

export function resolveGalleryDir(kind: EntityKind, contentDir: string, slug: string): string {
  if (kind === 'character') return characterGalleryDir(contentDir, slug)
  if (kind === 'organization') return orgGalleryDir(contentDir, slug)
  return galleryDir(contentDir, slug)
}

export function resolveGalleryImageUrl(
  kind: EntityKind,
  campaignId: string,
  slug: string,
  imageId: string,
): string {
  if (kind === 'character') return characterGalleryImageUrl(campaignId, slug, imageId)
  if (kind === 'organization') return orgGalleryImageUrl(campaignId, slug, imageId)
  return galleryImageUrl(campaignId, slug, imageId)
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
 * Sync the primary image URL to the entity-type-specific mirror column.
 *
 * - location  → entities.imageUrl  (read by graph builder, export, map pins)
 * - character → characters.portraitUrl
 * - organization → organizations.imageUrl
 *
 * Must be called inside the same transaction as the gallery mutation.
 */
export function syncPrimaryImageUrl(
  db: Db,
  entityId: string,
  kind: EntityKind = 'location',
): string | null {
  const primary = db
    .select({ url: entityImages.url })
    .from(entityImages)
    .where(and(eq(entityImages.entityId, entityId), eq(entityImages.isPrimary, true)))
    .get()

  const url = primary?.url ?? null

  if (kind === 'character') {
    db.update(characters).set({ portraitUrl: url }).where(eq(characters.entityId, entityId)).run()
  } else if (kind === 'organization') {
    db.update(organizations)
      .set({ imageUrl: url })
      .where(eq(organizations.entityId, entityId))
      .run()
  } else {
    db.update(entities).set({ imageUrl: url }).where(eq(entities.id, entityId)).run()
  }

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
  entityKind?: EntityKind
}

/**
 * Append an image to the gallery. The first image of an empty gallery becomes the primary.
 *
 * The file is written before the transaction (better-sqlite3 transactions are synchronous, so no
 * awaits may happen inside one) and unlinked again if the transaction fails — the row is the
 * truth, so a row without its file is the state worth preventing.
 */
export async function addImage(db: Db, input: AddImageInput): Promise<EntityImageDTO> {
  const kind = input.entityKind ?? 'location'
  const imageId = randomUUID()
  const filename = `${imageId}${input.ext}`
  const dir = resolveGalleryDir(kind, input.contentDir, input.slug)
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
        url: resolveGalleryImageUrl(kind, input.campaignId, input.slug, imageId),
        caption: input.caption?.trim() ? input.caption.trim() : null,
        sortOrder,
        isPrimary: isFirst,
        createdBy: input.userId,
        createdAt: new Date(),
      }

      tx.insert(entityImages).values(row).run()
      syncPrimaryImageUrl(tx as unknown as Db, input.entityId, kind)

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
  kind: EntityKind = 'location',
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

    syncPrimaryImageUrl(tx as unknown as Db, entityId, kind)

    return toDTO(getImage(tx as unknown as Db, entityId, imageId)!)
  })
}

export interface DeleteImageInput {
  entityId: string
  imageId: string
  slug: string
  contentDir: string
  entityKind?: EntityKind
}

/**
 * Remove an image. When the deleted row was the primary, the lowest-sortOrder survivor is
 * promoted in the same transaction, so a non-empty gallery always has exactly one primary.
 *
 * A failed unlink is logged and swallowed: the row is the truth and a stale file is harmless,
 * whereas a 500 on delete is not.
 */
export async function deleteImage(db: Db, input: DeleteImageInput): Promise<boolean> {
  const kind = input.entityKind ?? 'location'
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

    syncPrimaryImageUrl(tx as unknown as Db, input.entityId, kind)
    return existing
  })

  if (!result) return false

  const filePath = join(resolveGalleryDir(kind, input.contentDir, input.slug), result.filename)
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
