import { randomUUID } from 'crypto'
import { eq, and } from 'drizzle-orm'
import { useDb, useSqlite } from '../../../../utils/db'
import { entities } from '../../../../db/schema/entities'
import { hasMinRole } from '../../../../utils/permissions'
import { writeEntityFile, resolveEntityPath } from '../../../../services/content'
import { ensureUniqueSlug } from '../../../../utils/content-helpers'
import { indexEntity } from '../../../../services/search'
import { invalidateAutomatonCache } from '../../../../services/autolink'
import { join } from 'path'
import type { CampaignRole } from '../../../../utils/permissions'

const VALID_SUBTYPES = ['country', 'region', 'city', 'town', 'village', 'dungeon', 'lair', 'building', 'room', 'wilderness', 'other']

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can create locations' })
  }

  const body = await readBody(event)
  const { name, subtype, parentId, visibility, content } = body

  if (!name?.trim()) {
    throw createError({ statusCode: 400, message: 'Name is required' })
  }

  const resolvedSubtype = VALID_SUBTYPES.includes(subtype) ? subtype : 'other'

  const db = useDb()
  const sqlite = useSqlite()
  const campaign = event.context.campaign
  const campaignId = getRouterParam(event, 'id')!

  // Validate parentId belongs to a location in this campaign
  if (parentId) {
    const parent = db.select().from(entities)
      .where(and(eq(entities.id, parentId), eq(entities.campaignId, campaignId), eq(entities.type, 'location')))
      .get()
    if (!parent) throw createError({ statusCode: 400, message: 'Invalid parentId: location not found in this campaign' })
  }

  const id = randomUUID()
  const now = new Date()

  const slug = ensureUniqueSlug(db, campaignId, name)

  const contentDir = join(process.cwd(), campaign.contentDir)
  const filePath = resolveEntityPath(contentDir, 'location', slug)
  const frontmatter = {
    id,
    type: 'location',
    name: name.trim(),
    aliases: [],
    tags: [],
    visibility: visibility || 'members',
    parent: parentId || null,
    fields: { subtype: resolvedSubtype },
  }

  const hash = await writeEntityFile(filePath, frontmatter, content || '')

  db.insert(entities).values({
    id,
    campaignId,
    type: 'location',
    name: name.trim(),
    slug,
    filePath,
    visibility: visibility || 'members',
    contentHash: hash,
    parentId: parentId || null,
    createdBy: event.context.user.id,
    createdAt: now,
    updatedAt: now,
  }).run()

  indexEntity(sqlite, id, campaignId, name.trim(), [], [], content || '')
  invalidateAutomatonCache(campaignId)

  return { id, slug, name: name.trim(), subtype: resolvedSubtype, parentId: parentId || null, visibility: visibility || 'members' }
})
