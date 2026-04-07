import { eq, and, inArray } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { entities, entityTags, tags } from '../../../../../db/schema/entities'
import { characters } from '../../../../../db/schema/characters'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

// GET /api/campaigns/:id/diagrams/entities/batch?ids=id1,id2,...
// Returns Record<entityId, { id, name, type, slug, portraitUrl, tags, status }>
// Requires player+ role. Unknown IDs silently omitted.
export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'player')) {
    throw createError({ statusCode: 401, message: 'Authentication required' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const idsParam = (getQuery(event).ids as string | undefined)?.trim() ?? ''

  if (!idsParam) {
    return {}
  }

  const ids = idsParam
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 100)

  if (ids.length === 0) {
    return {}
  }

  const db = useDb()

  // Base entity query — restrict to this campaign
  const entityRows = db
    .select({
      id: entities.id,
      name: entities.name,
      type: entities.type,
      slug: entities.slug,
      visibility: entities.visibility,
      imageUrl: entities.imageUrl,
    })
    .from(entities)
    .where(and(eq(entities.campaignId, campaignId), inArray(entities.id, ids)))
    .all()

  // Task 1.2: visibility filtering — players cannot see dm_only entities
  const isDmLevel = hasMinRole(role, 'co_dm')
  const visibleEntities = isDmLevel
    ? entityRows
    : entityRows.filter((e) => e.visibility !== 'dm_only')

  if (visibleEntities.length === 0) {
    return {}
  }

  const visibleIds = visibleEntities.map((e) => e.id)

  // Fetch character rows for character entities
  const charRows = db
    .select({
      entityId: characters.entityId,
      portraitUrl: characters.portraitUrl,
      status: characters.status,
    })
    .from(characters)
    .innerJoin(entities, eq(characters.entityId, entities.id))
    .where(and(eq(entities.campaignId, campaignId), inArray(characters.entityId, visibleIds)))
    .all()

  const charByEntityId = new Map(charRows.map((c) => [c.entityId, c]))

  // Fetch tags for visible entities
  const tagRows = db
    .select({
      entityId: entityTags.entityId,
      tagName: tags.name,
    })
    .from(entityTags)
    .innerJoin(tags, eq(entityTags.tagId, tags.id))
    .where(inArray(entityTags.entityId, visibleIds))
    .all()

  const tagsByEntityId = new Map<string, string[]>()
  for (const row of tagRows) {
    const list = tagsByEntityId.get(row.entityId) ?? []
    list.push(row.tagName)
    tagsByEntityId.set(row.entityId, list)
  }

  const result: Record<
    string,
    {
      id: string
      name: string
      type: string
      slug: string
      portraitUrl: string | null
      tags: string[]
      status: string | null
    }
  > = {}

  for (const entity of visibleEntities) {
    const charData = charByEntityId.get(entity.id)
    result[entity.id] = {
      id: entity.id,
      name: entity.name,
      type: entity.type,
      slug: entity.slug,
      portraitUrl: charData?.portraitUrl ?? entity.imageUrl ?? null,
      tags: tagsByEntityId.get(entity.id) ?? [],
      status: charData?.status ?? null,
    }
  }

  return result
})
