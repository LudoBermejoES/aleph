import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../../utils/db'
import { entities } from '../../../../../../db/schema/entities'
import { characters, abilities } from '../../../../../../db/schema/characters'
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

  let result = db.select().from(abilities)
    .where(eq(abilities.characterId, character.id))
    .orderBy(abilities.sortOrder)
    .all()

  if (!hasMinRole(role, 'co_dm')) {
    result = result.filter(a => !a.isSecret)
  }

  // Filter by type and tags
  const query = getQuery(event)
  if (query.type) result = result.filter(a => a.type === query.type)
  if (query.tag) {
    const tag = (query.tag as string).toLowerCase()
    result = result.filter(a => {
      if (!a.tagsJson) return false
      const tags = JSON.parse(a.tagsJson) as string[]
      return tags.some(t => t.toLowerCase() === tag)
    })
  }

  return result
})
