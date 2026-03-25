import { eq, and } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { useDb } from '../../../../../../utils/db'
import { entities } from '../../../../../../db/schema/entities'
import { characters, characterStats, statDefinitions, statGroups } from '../../../../../../db/schema/characters'
import { hasMinRole } from '../../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  const userId = event.context.user.id
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const body = await readBody(event)
  const { stats } = body // Array of { statDefinitionId, value }

  if (!Array.isArray(stats)) {
    throw createError({ statusCode: 400, message: 'Stats array is required' })
  }

  // Empty array is a no-op
  if (stats.length === 0) return { success: true }

  const db = useDb()

  const entity = db.select().from(entities)
    .where(and(eq(entities.campaignId, campaignId), eq(entities.slug, slug)))
    .get()
  if (!entity) throw createError({ statusCode: 404, message: 'Character not found' })

  const character = db.select().from(characters).where(eq(characters.entityId, entity.id)).get()
  if (!character) throw createError({ statusCode: 404, message: 'Character data not found' })

  // Player ownership check
  const isOwner = character.ownerUserId === userId
  const isDm = hasMinRole(role, 'co_dm')

  for (const { statDefinitionId, value } of stats) {
    // Check player_editable permission
    if (!isDm) {
      const def = db.select({ groupPlayerEditable: statGroups.playerEditable })
        .from(statDefinitions)
        .innerJoin(statGroups, eq(statDefinitions.statGroupId, statGroups.id))
        .where(eq(statDefinitions.id, statDefinitionId))
        .get()

      if (!def?.groupPlayerEditable || !isOwner) {
        throw createError({ statusCode: 403, message: 'Cannot edit this stat' })
      }
    }

    // Upsert stat value
    const existing = db.select().from(characterStats)
      .where(and(eq(characterStats.characterId, character.id), eq(characterStats.statDefinitionId, statDefinitionId)))
      .get()

    if (existing) {
      db.update(characterStats).set({ value: String(value) }).where(eq(characterStats.id, existing.id)).run()
    } else {
      db.insert(characterStats).values({
        id: randomUUID(),
        characterId: character.id,
        statDefinitionId,
        value: String(value),
      }).run()
    }
  }

  return { success: true }
})
