import { randomUUID } from 'crypto'
import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { useSqlite } from '../../../../utils/db'
import { entities } from '../../../../db/schema/entities'
import { hasMinRole } from '../../../../utils/permissions'
import { writeEntityFile, slugify, resolveEntityPath } from '../../../../services/content'
import { indexEntity } from '../../../../services/search'
import { logger } from '../../../../utils/logger'
import { join } from 'path'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can create entities' })
  }

  const body = await readBody(event)
  const { name, type, content, visibility, aliases, tags, parentId, templateId, fields } = body

  if (!name?.trim() || !type?.trim()) {
    throw createError({ statusCode: 400, message: 'Name and type are required' })
  }

  const db = useDb()
  const sqlite = useSqlite()
  const campaign = event.context.campaign
  const campaignId = getRouterParam(event, 'id')!
  const id = randomUUID()
  const now = new Date()

  // Generate unique slug (scoped to campaign)
  let slug = slugify(name)
  const existing = db.select().from(entities)
    .where(and(eq(entities.campaignId, campaignId), eq(entities.slug, slug)))
    .get()
  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`
  }

  // Write .md file
  const contentDir = join(process.cwd(), campaign.contentDir)
  const filePath = resolveEntityPath(contentDir, type, slug)
  const frontmatter = {
    id,
    type,
    name: name.trim(),
    aliases: aliases || [],
    tags: tags || [],
    visibility: visibility || 'members',
    template: templateId,
    parent: parentId,
    fields: fields || {},
  }

  const hash = await writeEntityFile(filePath, frontmatter, content || '')

  // Insert DB row
  db.insert(entities).values({
    id,
    campaignId,
    type,
    name: name.trim(),
    slug,
    filePath,
    visibility: visibility || 'members',
    contentHash: hash,
    parentId: parentId || null,
    templateId: templateId || null,
    createdBy: event.context.user.id,
    createdAt: now,
    updatedAt: now,
  }).run()

  // Index in FTS5
  indexEntity(sqlite, id, campaignId, name.trim(), aliases || [], tags || [], content || '')

  logger.debug('Entity created', { entityId: id, name, type, campaignId })

  return { id, slug, name: name.trim(), type, filePath }
})
