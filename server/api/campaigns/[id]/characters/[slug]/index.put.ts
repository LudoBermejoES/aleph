import { eq, and } from 'drizzle-orm'
import { useDb, useSqlite } from '../../../../../utils/db'
import { entities } from '../../../../../db/schema/entities'
import { characters } from '../../../../../db/schema/characters'
import { canEditCharacter } from '../../../../../services/characters'
import { writeEntityFile, readEntityFile } from '../../../../../services/content'
import { indexEntity } from '../../../../../services/search'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  const userId = event.context.user.id
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const body = await readBody(event)
  const db = useDb()
  const sqlite = useSqlite()

  const entity = db.select().from(entities)
    .where(and(eq(entities.campaignId, campaignId), eq(entities.slug, slug)))
    .get()
  if (!entity) throw createError({ statusCode: 404, message: 'Character not found' })

  const character = db.select().from(characters)
    .where(eq(characters.entityId, entity.id))
    .get()
  if (!character) throw createError({ statusCode: 404, message: 'Character data not found' })

  // Permission check: player can only edit their own PC
  if (!canEditCharacter(role, userId, character.ownerUserId)) {
    throw createError({ statusCode: 403, message: 'You can only edit your own character' })
  }

  // Update character fields
  const charUpdates: Record<string, unknown> = {}
  if (body.race !== undefined) charUpdates.race = body.race
  if (body.class !== undefined) charUpdates.class = body.class
  if (body.alignment !== undefined) charUpdates.alignment = body.alignment
  if (body.status !== undefined) charUpdates.status = body.status
  if (body.locationEntityId !== undefined) charUpdates.locationEntityId = body.locationEntityId
  if (body.folderId !== undefined) charUpdates.folderId = body.folderId

  if (Object.keys(charUpdates).length > 0) {
    db.update(characters).set(charUpdates).where(eq(characters.id, character.id)).run()
  }

  // Update entity/content
  let existing
  try { existing = await readEntityFile(entity.filePath) } catch { existing = { frontmatter: { type: 'character', name: entity.name, aliases: [], tags: [], visibility: 'members' as const, fields: {} }, content: '' } }

  const updatedFm = {
    ...existing.frontmatter,
    name: body.name ?? existing.frontmatter.name,
    aliases: body.aliases ?? existing.frontmatter.aliases,
    tags: body.tags ?? existing.frontmatter.tags,
    visibility: body.visibility ?? existing.frontmatter.visibility,
  }
  const updatedContent = body.content ?? existing.content
  const hash = await writeEntityFile(entity.filePath, updatedFm, updatedContent)

  const now = new Date()
  db.update(entities).set({
    name: updatedFm.name,
    visibility: updatedFm.visibility,
    contentHash: hash,
    updatedAt: now,
  }).where(eq(entities.id, entity.id)).run()

  indexEntity(sqlite, entity.id, campaignId, updatedFm.name, updatedFm.aliases || [], updatedFm.tags || [], updatedContent)

  return { success: true }
})
