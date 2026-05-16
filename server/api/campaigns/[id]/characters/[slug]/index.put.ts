import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { useDb, useSqlite } from '../../../../../utils/db'
import { validateBody } from '../../../../../utils/validate'
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
  const characterPutSchema = z.object({
    name: z.string().min(1).max(200).optional(),
    content: z.string().optional(),
    visibility: z
      .enum(['public', 'members', 'editors', 'dm_only', 'private', 'specific_users'])
      .optional(),
    aliases: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    characterType: z.string().optional(),
    status: z.string().optional(),
    locationEntityId: z.string().nullable().optional(),
    folderId: z.string().optional(),
    templateId: z.string().optional(),
    fields: z.record(z.string(), z.unknown()).optional(),
    backstory: z.string().nullable().optional(),
    history: z.string().nullable().optional(),
    currentStatus: z.string().nullable().optional(),
    birthYear: z.number().int().nullable().optional(),
    deathYear: z.number().int().nullable().optional(),
    gender: z.string().max(100).nullable().optional(),
  })
  const body = await validateBody(event, characterPutSchema)
  const db = useDb()
  const sqlite = useSqlite()

  const entity = db
    .select()
    .from(entities)
    .where(and(eq(entities.campaignId, campaignId), eq(entities.slug, slug)))
    .get()
  if (!entity) throw createError({ statusCode: 404, message: 'Character not found' })

  const character = db.select().from(characters).where(eq(characters.entityId, entity.id)).get()
  if (!character) throw createError({ statusCode: 404, message: 'Character data not found' })

  // Permission check: player can only edit their own PC
  if (!canEditCharacter(role, userId, character.ownerUserId)) {
    throw createError({ statusCode: 403, message: 'You can only edit your own character' })
  }

  // Hard-reject invalid year range
  const resolvedBirthYear = body.birthYear !== undefined ? body.birthYear : character.birthYear
  const resolvedDeathYear = body.deathYear !== undefined ? body.deathYear : character.deathYear
  if (
    resolvedBirthYear !== null &&
    resolvedDeathYear !== null &&
    resolvedDeathYear < resolvedBirthYear
  ) {
    throw createError({ statusCode: 400, message: 'deathYear must not be less than birthYear' })
  }

  // Update character fields
  const charUpdates: Record<string, unknown> = {}
  if (body.status !== undefined) charUpdates.status = body.status
  if (body.characterType !== undefined) charUpdates.characterType = body.characterType
  if (body.locationEntityId !== undefined) charUpdates.locationEntityId = body.locationEntityId
  if (body.folderId !== undefined) charUpdates.folderId = body.folderId
  if (body.birthYear !== undefined) charUpdates.birthYear = body.birthYear
  if (body.deathYear !== undefined) charUpdates.deathYear = body.deathYear
  if (body.gender !== undefined)
    charUpdates.gender = body.gender !== null ? body.gender.toLowerCase().trim() : null
  if (body.backstory !== undefined) charUpdates.backstory = body.backstory
  if (body.history !== undefined) charUpdates.history = body.history
  if (body.currentStatus !== undefined) charUpdates.currentStatus = body.currentStatus

  if (Object.keys(charUpdates).length > 0) {
    db.update(characters).set(charUpdates).where(eq(characters.id, character.id)).run()
  }

  // Update entity/content
  let existing
  try {
    existing = await readEntityFile(entity.filePath)
  } catch {
    existing = {
      frontmatter: {
        type: 'character',
        name: entity.name,
        aliases: [],
        tags: [],
        visibility: 'members' as const,
        fields: {},
      },
      content: '',
    }
  }

  const existingFields = (existing.frontmatter.fields as Record<string, unknown>) ?? {}
  const updatedFm = {
    ...existing.frontmatter,
    name: body.name ?? existing.frontmatter.name,
    aliases: body.aliases ?? existing.frontmatter.aliases,
    tags: body.tags ?? existing.frontmatter.tags,
    visibility: body.visibility ?? existing.frontmatter.visibility,
    fields: body.fields !== undefined ? { ...existingFields, ...body.fields } : existingFields,
  }
  const updatedContent = body.content ?? existing.content
  const hash = await writeEntityFile(entity.filePath, updatedFm, updatedContent)

  const now = new Date()
  const entityUpdates: Record<string, unknown> = {
    name: updatedFm.name,
    visibility: updatedFm.visibility,
    contentHash: hash,
    updatedAt: now,
  }
  if (body.templateId !== undefined) entityUpdates.templateId = body.templateId
  db.update(entities).set(entityUpdates).where(eq(entities.id, entity.id)).run()

  indexEntity(
    sqlite,
    entity.id,
    campaignId,
    updatedFm.name,
    updatedFm.aliases || [],
    updatedFm.tags || [],
    updatedContent,
  )

  return { success: true }
})
