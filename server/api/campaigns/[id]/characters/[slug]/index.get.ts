import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { entities } from '../../../../../db/schema/entities'
import {
  characters,
  characterStats,
  statDefinitions,
  statGroups,
  abilities,
} from '../../../../../db/schema/characters'
import { readEntityFile, stripSecretBlocks } from '../../../../../services/content'
import { stripSecretStats, stripSecretAbilities } from '../../../../../services/characters'
import type { CampaignRole } from '../../../../../utils/permissions'
import {
  hasMinRole,
  canUserAccessEntity,
  getCachedPermission,
  setCachedPermission,
} from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const actualRole = event.context.campaignRole as CampaignRole
  const userId = event.context.user?.id || ''
  const db = useDb()

  // Support preview_as for DM/Co-DM only
  const previewAs = getQuery(event).preview_as as string | undefined
  let role = actualRole
  if (previewAs && hasMinRole(actualRole, 'co_dm')) {
    const validRoles: CampaignRole[] = ['dm', 'co_dm', 'editor', 'player', 'visitor']
    if (validRoles.includes(previewAs as CampaignRole)) {
      role = previewAs as CampaignRole
    }
  }

  const entity = db
    .select()
    .from(entities)
    .where(and(eq(entities.campaignId, campaignId), eq(entities.slug, slug)))
    .get()
  if (!entity) throw createError({ statusCode: 404, message: 'Character not found' })

  // Visibility enforcement
  const cached = getCachedPermission(userId, entity.id, 'view')
  const canAccess =
    cached !== null
      ? cached
      : await canUserAccessEntity(
          db,
          userId,
          'user',
          actualRole,
          entity.id,
          entity.visibility,
          entity.createdBy,
          'view',
        )
  if (cached === null) setCachedPermission(userId, entity.id, 'view', canAccess)
  if (!canAccess) throw createError({ statusCode: 404, message: 'Character not found' })

  const character = db.select().from(characters).where(eq(characters.entityId, entity.id)).get()
  if (!character) throw createError({ statusCode: 404, message: 'Character data not found' })

  // Get stats with group info
  const stats = db
    .select({
      id: characterStats.id,
      value: characterStats.value,
      defId: statDefinitions.id,
      defName: statDefinitions.name,
      defKey: statDefinitions.key,
      defValueType: statDefinitions.valueType,
      defIsSecret: statDefinitions.isSecret,
      groupId: statGroups.id,
      groupName: statGroups.name,
      groupPlayerEditable: statGroups.playerEditable,
    })
    .from(characterStats)
    .innerJoin(statDefinitions, eq(characterStats.statDefinitionId, statDefinitions.id))
    .innerJoin(statGroups, eq(statDefinitions.statGroupId, statGroups.id))
    .where(eq(characterStats.characterId, character.id))
    .all()

  // Get abilities
  let charAbilities = db
    .select()
    .from(abilities)
    .where(eq(abilities.characterId, character.id))
    .orderBy(abilities.sortOrder)
    .all()

  // Strip secrets for non-DM using service functions
  const filteredStats = stripSecretStats(stats, role)
  charAbilities = stripSecretAbilities(charAbilities, role)

  // Read markdown
  let file
  try {
    file = await readEntityFile(entity.filePath)
  } catch {
    file = { frontmatter: {}, content: '', contentHash: '' }
  }

  // Resolve location name if set
  let locationName: string | null = null
  let locationSlug: string | null = null
  if (character.locationEntityId) {
    const locationEntity = db
      .select({ name: entities.name, slug: entities.slug })
      .from(entities)
      .where(eq(entities.id, character.locationEntityId))
      .get()
    locationName = locationEntity?.name ?? null
    locationSlug = locationEntity?.slug ?? null
  }

  const description = stripSecretBlocks(file.content, role).trim()
  return {
    ...entity,
    ...character,
    locationName,
    locationSlug,
    portraitUrl: character.portraitUrl ?? null,
    frontmatter: file.frontmatter,
    fields: (file.frontmatter as Record<string, unknown>).fields || {},
    content: description,
    description,
    backstory: character.backstory ?? null,
    history: character.history ?? null,
    currentStatus: character.currentStatus ?? null,
    stats: filteredStats,
    abilities: charAbilities,
  }
})
