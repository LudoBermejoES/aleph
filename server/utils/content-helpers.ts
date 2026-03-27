import { eq, and } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { entities } from '../db/schema/entities'
import { slugify, readEntityFile } from '../services/content'

/**
 * Return a slug unique within a campaign. Appends a timestamp suffix if the
 * plain slug already exists.
 */
export function ensureUniqueSlug(
  db: BetterSQLite3Database,
  campaignId: string,
  baseName: string,
): string {
  let slug = slugify(baseName)
  const existing = db.select({ id: entities.id })
    .from(entities)
    .where(and(eq(entities.campaignId, campaignId), eq(entities.slug, slug)))
    .get()
  if (existing) slug = `${slug}-${Date.now().toString(36)}`
  return slug
}

/**
 * Read an entity markdown file, returning null instead of throwing on failure.
 */
export async function safeReadEntityFile(filePath: string) {
  try {
    return await readEntityFile(filePath)
  } catch {
    return null
  }
}
