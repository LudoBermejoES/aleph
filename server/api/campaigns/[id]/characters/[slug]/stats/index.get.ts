import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../../utils/db'
import { entities } from '../../../../../../db/schema/entities'
import { characters, characterStats, statDefinitions, statGroups } from '../../../../../../db/schema/characters'
import { hasMinRole } from '../../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const role = event.context.campaignRole as CampaignRole
  const db = useDb()

  const entity = db.select().from(entities)
    .where(and(eq(entities.campaignId, campaignId), eq(entities.slug, slug)))
    .get()
  if (!entity) throw createError({ statusCode: 404, message: 'Character not found' })

  const character = db.select().from(characters).where(eq(characters.entityId, entity.id)).get()
  if (!character) throw createError({ statusCode: 404, message: 'Character data not found' })

  const stats = db.select({
    id: characterStats.id,
    value: characterStats.value,
    statDefinitionId: characterStats.statDefinitionId,
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

  const isDm = hasMinRole(role, 'co_dm')
  return isDm ? stats : stats.filter(s => !s.defIsSecret)
})
