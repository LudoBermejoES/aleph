import { randomUUID } from 'crypto'
import { eq, and } from 'drizzle-orm'
import { useDb, useSqlite } from '../../../../../utils/db'
import { entities } from '../../../../../db/schema/entities'
import { characters, characterStats, abilities } from '../../../../../db/schema/characters'
import { hasMinRole } from '../../../../../utils/permissions'
import { readEntityFile, writeEntityFile, slugify, resolveEntityPath } from '../../../../../services/content'
import { indexEntity } from '../../../../../services/search'
import { join } from 'path'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can duplicate characters' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()
  const sqlite = useSqlite()
  const campaign = event.context.campaign

  // Load original
  const origEntity = db.select().from(entities)
    .where(and(eq(entities.campaignId, campaignId), eq(entities.slug, slug)))
    .get()
  if (!origEntity) throw createError({ statusCode: 404, message: 'Character not found' })

  const origChar = db.select().from(characters).where(eq(characters.entityId, origEntity.id)).get()
  if (!origChar) throw createError({ statusCode: 404, message: 'Character data not found' })

  const origStats = db.select().from(characterStats).where(eq(characterStats.characterId, origChar.id)).all()
  const origAbilities = db.select().from(abilities).where(eq(abilities.characterId, origChar.id)).all()

  // Create copy
  const newName = `${origEntity.name} (Copy)`
  const newEntityId = randomUUID()
  const newCharId = randomUUID()
  const now = new Date()
  let newSlug = slugify(newName)
  const existingSlug = db.select().from(entities)
    .where(and(eq(entities.campaignId, campaignId), eq(entities.slug, newSlug)))
    .get()
  if (existingSlug) newSlug = `${newSlug}-${Date.now().toString(36)}`

  // Copy .md file
  let origFile
  try { origFile = await readEntityFile(origEntity.filePath) } catch { origFile = { frontmatter: {}, content: '' } }

  const contentDir = join(process.cwd(), campaign.contentDir)
  const newFilePath = resolveEntityPath(contentDir, 'character', newSlug)
  const newFm = { ...origFile.frontmatter, id: newEntityId, name: newName }
  const hash = await writeEntityFile(newFilePath, newFm, origFile.content || '')

  // Insert entity
  db.insert(entities).values({
    id: newEntityId, campaignId, type: 'character', name: newName, slug: newSlug,
    filePath: newFilePath, visibility: origEntity.visibility, contentHash: hash,
    createdBy: event.context.user.id, createdAt: now, updatedAt: now,
  }).run()

  // Insert character
  db.insert(characters).values({
    id: newCharId, entityId: newEntityId, characterType: origChar.characterType,
    race: origChar.race, class: origChar.class, alignment: origChar.alignment,
    status: origChar.status, ownerUserId: null, isCompanionOf: origChar.isCompanionOf,
  }).run()

  // Copy stats
  for (const stat of origStats) {
    db.insert(characterStats).values({
      id: randomUUID(), characterId: newCharId,
      statDefinitionId: stat.statDefinitionId, value: stat.value,
    }).run()
  }

  // Copy abilities
  for (const ab of origAbilities) {
    db.insert(abilities).values({
      id: randomUUID(), characterId: newCharId, name: ab.name,
      type: ab.type, description: ab.description, tagsJson: ab.tagsJson,
      sortOrder: ab.sortOrder, isSecret: ab.isSecret,
    }).run()
  }

  indexEntity(sqlite, newEntityId, campaignId, newName, [], [], origFile.content || '')

  return { id: newCharId, entityId: newEntityId, slug: newSlug, name: newName }
})
