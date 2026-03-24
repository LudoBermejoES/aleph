import { randomUUID } from 'crypto'
import { eq, and } from 'drizzle-orm'
import { useDb, useSqlite } from '../../../../utils/db'
import { entities } from '../../../../db/schema/entities'
import { characters } from '../../../../db/schema/characters'
import { hasMinRole } from '../../../../utils/permissions'
import { writeEntityFile, slugify, resolveEntityPath } from '../../../../services/content'
import { indexEntity } from '../../../../services/search'
import { logger } from '../../../../utils/logger'
import { join } from 'path'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can create characters' })
  }

  const body = await readBody(event)
  const { name, content, visibility, aliases, tags, characterType, race, class: charClass, alignment, status, ownerUserId, isCompanionOf } = body

  if (!name?.trim()) {
    throw createError({ statusCode: 400, message: 'Name is required' })
  }

  const db = useDb()
  const sqlite = useSqlite()
  const campaign = event.context.campaign
  const campaignId = getRouterParam(event, 'id')!
  const entityId = randomUUID()
  const characterId = randomUUID()
  const now = new Date()

  // Generate unique slug
  let slug = slugify(name)
  const existing = db.select().from(entities)
    .where(and(eq(entities.campaignId, campaignId), eq(entities.slug, slug)))
    .get()
  if (existing) slug = `${slug}-${Date.now().toString(36)}`

  // Write .md file
  const contentDir = join(process.cwd(), campaign.contentDir)
  const filePath = resolveEntityPath(contentDir, 'character', slug)
  const frontmatter = {
    id: entityId,
    type: 'character',
    name: name.trim(),
    aliases: aliases || [],
    tags: tags || [],
    visibility: visibility || 'members',
    fields: Object.fromEntries(Object.entries({
      characterType: characterType || 'npc',
      race: race || undefined,
      class: charClass || undefined,
      alignment: alignment || undefined,
      status: status || 'alive',
    }).filter(([, v]) => v !== undefined)),
  }
  const hash = await writeEntityFile(filePath, frontmatter, content || '')

  // Insert entity row
  db.insert(entities).values({
    id: entityId,
    campaignId,
    type: 'character',
    name: name.trim(),
    slug,
    filePath,
    visibility: visibility || 'members',
    contentHash: hash,
    createdBy: event.context.user.id,
    createdAt: now,
    updatedAt: now,
  }).run()

  // Insert character extension row
  db.insert(characters).values({
    id: characterId,
    entityId,
    characterType: characterType || 'npc',
    race: race || null,
    class: charClass || null,
    alignment: alignment || null,
    status: status || 'alive',
    ownerUserId: ownerUserId || null,
    isCompanionOf: isCompanionOf || null,
  }).run()

  // Index in FTS5
  indexEntity(sqlite, entityId, campaignId, name.trim(), aliases || [], tags || [], content || '')

  logger.debug('Character created', { characterId, entityId, name, campaignId })

  return { id: characterId, entityId, slug, name: name.trim(), characterType: characterType || 'npc' }
})
