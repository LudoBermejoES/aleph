import { eq, and } from 'drizzle-orm'
import { useDb, useSqlite } from '../../../../utils/db'
import { entities } from '../../../../db/schema/entities'
import { hasMinRole } from '../../../../utils/permissions'
import { writeEntityFile, readEntityFile } from '../../../../services/content'
import { indexEntity } from '../../../../services/search'
import type { CampaignRole } from '../../../../utils/permissions'

const VALID_SUBTYPES = ['country', 'region', 'city', 'town', 'village', 'dungeon', 'lair', 'building', 'room', 'wilderness', 'other']

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can update locations' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const body = await readBody(event)
  const db = useDb()
  const sqlite = useSqlite()

  const entity = db.select().from(entities)
    .where(and(eq(entities.campaignId, campaignId), eq(entities.slug, slug), eq(entities.type, 'location')))
    .get()
  if (!entity) throw createError({ statusCode: 404, message: 'Location not found' })

  // Validate parentId
  if (body.parentId) {
    const parent = db.select().from(entities)
      .where(and(eq(entities.id, body.parentId), eq(entities.campaignId, campaignId), eq(entities.type, 'location')))
      .get()
    if (!parent) throw createError({ statusCode: 400, message: 'Invalid parentId' })
  }

  let existing
  try {
    existing = await readEntityFile(entity.filePath)
  } catch {
    existing = { frontmatter: { type: 'location', name: entity.name, aliases: [], tags: [], visibility: entity.visibility, fields: { subtype: 'other' } }, content: '' }
  }

  const resolvedSubtype = body.subtype && VALID_SUBTYPES.includes(body.subtype) ? body.subtype : (existing.frontmatter?.fields as any)?.subtype ?? 'other'

  const updatedFm = {
    ...existing.frontmatter,
    name: body.name ?? existing.frontmatter.name,
    visibility: body.visibility ?? existing.frontmatter.visibility,
    parent: body.parentId !== undefined ? (body.parentId || null) : existing.frontmatter.parent,
    fields: { ...(existing.frontmatter.fields as any ?? {}), subtype: resolvedSubtype },
  }
  const updatedContent = body.content ?? existing.content
  const hash = await writeEntityFile(entity.filePath, updatedFm, updatedContent)

  const now = new Date()
  db.update(entities).set({
    name: updatedFm.name,
    visibility: updatedFm.visibility,
    parentId: body.parentId !== undefined ? (body.parentId || null) : entity.parentId,
    contentHash: hash,
    updatedAt: now,
  }).where(eq(entities.id, entity.id)).run()

  indexEntity(sqlite, entity.id, campaignId, updatedFm.name, [], [], updatedContent)

  const updated = db.select().from(entities).where(eq(entities.id, entity.id)).get()!
  return {
    id: updated.id,
    name: updated.name,
    slug: updated.slug,
    subtype: resolvedSubtype,
    visibility: updated.visibility,
    parentId: updated.parentId,
  }
})
