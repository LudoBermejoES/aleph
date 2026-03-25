import { eq, and } from 'drizzle-orm'
import { useDb, useSqlite } from '../../../../utils/db'
import { entities } from '../../../../db/schema/entities'
import { hasMinRole } from '../../../../utils/permissions'
import { writeEntityFile, readEntityFile } from '../../../../services/content'
import { indexEntity } from '../../../../services/search'
import { invalidateAutomatonCache } from '../../../../services/autolink'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can edit entities' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const body = await readBody(event)
  const db = useDb()
  const sqlite = useSqlite()

  const entity = db.select().from(entities)
    .where(and(eq(entities.campaignId, campaignId), eq(entities.slug, slug)))
    .get()

  if (!entity) {
    throw createError({ statusCode: 404, message: 'Entity not found' })
  }

  // Read existing frontmatter, merge updates
  let existing
  try {
    existing = await readEntityFile(entity.filePath)
  } catch {
    existing = { frontmatter: { type: entity.type, name: entity.name }, content: '' }
  }

  const updatedFrontmatter = {
    ...existing.frontmatter,
    name: body.name ?? existing.frontmatter.name,
    aliases: body.aliases ?? existing.frontmatter.aliases,
    tags: body.tags ?? existing.frontmatter.tags,
    visibility: body.visibility ?? existing.frontmatter.visibility,
    fields: body.fields ?? existing.frontmatter.fields,
  }

  const updatedContent = body.content ?? existing.content
  const hash = await writeEntityFile(entity.filePath, updatedFrontmatter, updatedContent)

  // Update DB
  const now = new Date()
  db.update(entities)
    .set({
      name: updatedFrontmatter.name,
      visibility: updatedFrontmatter.visibility,
      contentHash: hash,
      updatedAt: now,
    })
    .where(eq(entities.id, entity.id))
    .run()

  // Re-index FTS5
  indexEntity(
    sqlite, entity.id, campaignId,
    updatedFrontmatter.name,
    updatedFrontmatter.aliases || [],
    updatedFrontmatter.tags || [],
    updatedContent,
  )

  // Invalidate autolink cache on name/alias change
  invalidateAutomatonCache(campaignId)

  return { ...entity, name: updatedFrontmatter.name, contentHash: hash, updatedAt: now }
})
