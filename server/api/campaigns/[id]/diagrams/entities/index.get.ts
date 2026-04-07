import { eq, and, like, or } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { characters } from '../../../../../db/schema/characters'
import { entities } from '../../../../../db/schema/entities'
import { organizations } from '../../../../../db/schema/organizations'
import { quests } from '../../../../../db/schema/sessions'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

const MAX_PER_TYPE = 10

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'player')) {
    throw createError({ statusCode: 403, message: 'Members can search entities' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const query = (getQuery(event).q as string | undefined)?.trim() ?? ''
  const db = useDb()

  const likeQ = query ? `%${query}%` : '%'

  // Characters (via entities join)
  const characterResults = db
    .select({
      id: entities.id,
      name: entities.name,
      slug: entities.slug,
      type: entities.type,
      portraitUrl: characters.portraitUrl,
    })
    .from(characters)
    .innerJoin(entities, eq(characters.entityId, entities.id))
    .where(and(eq(entities.campaignId, campaignId), like(entities.name, likeQ)))
    .limit(MAX_PER_TYPE)
    .all()
    .map((r) => ({ ...r, entityType: 'character' }))

  // Locations (entities of type 'location')
  const locationResults = db
    .select({
      id: entities.id,
      name: entities.name,
      slug: entities.slug,
      type: entities.type,
      portraitUrl: entities.imageUrl,
    })
    .from(entities)
    .where(
      and(
        eq(entities.campaignId, campaignId),
        eq(entities.type, 'location'),
        like(entities.name, likeQ),
      ),
    )
    .limit(MAX_PER_TYPE)
    .all()
    .map((r) => ({ ...r, entityType: 'location' }))

  // Organizations
  const orgResults = db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
    })
    .from(organizations)
    .where(and(eq(organizations.campaignId, campaignId), like(organizations.name, likeQ)))
    .limit(MAX_PER_TYPE)
    .all()
    .map((r) => ({ ...r, entityType: 'organization', portraitUrl: null, type: 'organization' }))

  // Quests
  const questResults = db
    .select({
      id: quests.id,
      name: quests.name,
      slug: quests.slug,
      status: quests.status,
    })
    .from(quests)
    .where(and(eq(quests.campaignId, campaignId), like(quests.name, likeQ)))
    .limit(MAX_PER_TYPE)
    .all()
    .map((r) => ({ ...r, entityType: 'quest', portraitUrl: null, type: 'quest' }))

  // Wiki entities (generic entity types)
  const wikiResults = db
    .select({
      id: entities.id,
      name: entities.name,
      slug: entities.slug,
      type: entities.type,
      portraitUrl: entities.imageUrl,
    })
    .from(entities)
    .where(
      and(
        eq(entities.campaignId, campaignId),
        or(eq(entities.type, 'entity'), eq(entities.type, 'wiki')),
        like(entities.name, likeQ),
      ),
    )
    .limit(MAX_PER_TYPE)
    .all()
    .map((r) => ({ ...r, entityType: 'wiki' }))

  return {
    characters: characterResults,
    locations: locationResults,
    organizations: orgResults,
    quests: questResults,
    wiki: wikiResults,
  }
})
