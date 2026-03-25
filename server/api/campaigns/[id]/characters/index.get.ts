import { eq, and, like, desc } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { entities } from '../../../../db/schema/entities'
import { characters } from '../../../../db/schema/characters'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const query = getQuery(event)
  const db = useDb()

  const characterType = query.type as string | undefined // pc, npc
  const status = query.status as string | undefined
  const search = query.search as string | undefined
  const folderId = query.folderId as string | undefined
  const companionOf = query.companionOf as string | undefined

  let q = db.select({
    id: characters.id,
    entityId: characters.entityId,
    name: entities.name,
    slug: entities.slug,
    characterType: characters.characterType,
    race: characters.race,
    class: characters.class,
    alignment: characters.alignment,
    status: characters.status,
    visibility: entities.visibility,
    ownerUserId: characters.ownerUserId,
    isCompanionOf: characters.isCompanionOf,
    folderId: characters.folderId,
    updatedAt: entities.updatedAt,
  })
    .from(characters)
    .innerJoin(entities, eq(characters.entityId, entities.id))
    .where(eq(entities.campaignId, campaignId))
    .$dynamic()

  // Apply filters using raw SQL conditions
  const results = q.orderBy(desc(entities.updatedAt)).all()

  // Filter in JS for simplicity (small dataset per campaign)
  let filtered = results
  if (characterType) filtered = filtered.filter(c => c.characterType === characterType)
  if (status) filtered = filtered.filter(c => c.status === status)
  if (search) {
    const s = search.toLowerCase()
    filtered = filtered.filter(c => c.name.toLowerCase().includes(s))
  }
  if (folderId) filtered = filtered.filter((c: any) => c.folderId === folderId)
  if (companionOf) filtered = filtered.filter(c => c.isCompanionOf === companionOf)

  return filtered
})
