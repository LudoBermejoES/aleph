import { randomUUID } from 'crypto'
import { z } from 'zod'
import { useDb } from '../../../../utils/db'
import { useSqlite } from '../../../../utils/db'
import { entities } from '../../../../db/schema/entities'
import { hasMinRole } from '../../../../utils/permissions'
import { writeEntityFile, resolveEntityPath } from '../../../../services/content'
import { ensureUniqueSlug } from '../../../../utils/content-helpers'
import { indexEntity } from '../../../../services/search'
import { logger } from '../../../../utils/logger'
import { invalidateAutomatonCache } from '../../../../services/autolink'
import { validateBody } from '../../../../utils/validate'
import { join } from 'path'
import type { CampaignRole } from '../../../../utils/permissions'

const entitySchema = z.object({
  name: z.string().min(1).max(200),
  type: z.string().min(1),
  content: z.string().optional(),
  visibility: z.enum(['public', 'members', 'editors', 'dm_only', 'private', 'specific_users']).optional(),
  aliases: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  parentId: z.string().optional(),
  templateId: z.string().optional(),
  fields: z.record(z.string(), z.unknown()).optional(),
})

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can create entities' })
  }

  const { name, type, content, visibility, aliases, tags, parentId, templateId, fields } = await validateBody(event, entitySchema)

  const db = useDb()
  const sqlite = useSqlite()
  const campaign = event.context.campaign
  const campaignId = getRouterParam(event, 'id')!
  const id = randomUUID()
  const now = new Date()

  // Generate unique slug (scoped to campaign)
  const slug = ensureUniqueSlug(db, campaignId, name)

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

  // Invalidate autolink cache so new entity name is included in future matches
  invalidateAutomatonCache(campaignId)

  logger.debug('Entity created', { entityId: id, name, type, campaignId })

  return { id, slug, name: name.trim(), type, filePath }
})
