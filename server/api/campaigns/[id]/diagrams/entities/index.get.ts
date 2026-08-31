import { eq, and, like, or, ne, inArray } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { characters } from '../../../../../db/schema/characters'
import { entities } from '../../../../../db/schema/entities'
import { entityTypes } from '../../../../../db/schema/entity-types'
import { organizations } from '../../../../../db/schema/organizations'
import { quests } from '../../../../../db/schema/sessions'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'
import { buildPaletteGroups, fanoutTypeSlugs } from '../../../../../utils/diagram-palette'

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

  // Players must not be shown dm_only entities. The `batch` sibling has always done this; this
  // endpoint never did, and the palette therefore leaked the NAMES of every DM-only entity to any
  // player who opened a diagram (39 of 372 in the campaign this was found on).
  const isDmLevel = hasMinRole(role, 'co_dm')
  const visible = isDmLevel ? undefined : ne(entities.visibility, 'dm_only')

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
    .where(and(eq(entities.campaignId, campaignId), like(entities.name, likeQ), visible))
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
        visible,
      ),
    )
    .limit(MAX_PER_TYPE)
    .all()
    .map((r) => ({ ...r, entityType: 'location' }))

  // Organizations and quests live in their own tables with no visibility column of their own, but
  // both carry a nullable `entity_id`. A null one has no visibility record and stays visible.
  const dmOnlyEntityIds = isDmLevel
    ? new Set<string>()
    : new Set(
        db
          .select({ id: entities.id })
          .from(entities)
          .where(and(eq(entities.campaignId, campaignId), eq(entities.visibility, 'dm_only')))
          .all()
          .map((r) => r.id),
      )

  const orgResults = db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      imageUrl: organizations.imageUrl,
      entityId: organizations.entityId,
    })
    .from(organizations)
    .where(and(eq(organizations.campaignId, campaignId), like(organizations.name, likeQ)))
    .limit(MAX_PER_TYPE)
    .all()
    .filter((r) => !(r.entityId && dmOnlyEntityIds.has(r.entityId)))
    .map((r) => ({
      ...r,
      entityType: 'organization',
      portraitUrl: r.imageUrl ?? null,
      type: 'organization',
    }))

  const questResults = db
    .select({
      id: quests.id,
      name: quests.name,
      slug: quests.slug,
      status: quests.status,
      entityId: quests.entityId,
    })
    .from(quests)
    .where(and(eq(quests.campaignId, campaignId), like(quests.name, likeQ)))
    .limit(MAX_PER_TYPE)
    .all()
    .filter((r) => !(r.entityId && dmOnlyEntityIds.has(r.entityId)))
    .map((r) => ({ ...r, entityType: 'quest', portraitUrl: null, type: 'quest' }))

  // Legacy generic group. `entity` and `wiki` are types no campaign in this database uses — the
  // group has therefore always been empty, which is the whole defect this endpoint's fan-out
  // fixes. It is kept, and kept queried, so any reader still indexing `wiki` keeps working.
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
        visible,
      ),
    )
    .limit(MAX_PER_TYPE)
    .all()
    .map((r) => ({ ...r, entityType: 'wiki' }))

  // One group per entity type this campaign holds, minus the ones a dedicated group above already
  // serves. Two sources, because they disagree in both directions: `entity_types` gives the DM's
  // own labels and ordering, while the distinct types actually stored catch anything nobody
  // declared (measured: `arc` and `organization` are stored but undeclared, `faction`/`event`/
  // `note` declared but unused).
  const campaignTypes = db
    .select({
      slug: entityTypes.slug,
      name: entityTypes.name,
      sortOrder: entityTypes.sortOrder,
    })
    .from(entityTypes)
    .where(eq(entityTypes.campaignId, campaignId))
    .all()

  const presentTypes = db
    .selectDistinct({ type: entities.type })
    .from(entities)
    .where(eq(entities.campaignId, campaignId))
    .all()
    .map((r) => r.type)
    .filter((t): t is string => Boolean(t))

  const groups = buildPaletteGroups(campaignTypes, presentTypes)
  const fanout: Record<string, unknown[]> = {}

  const slugs = fanoutTypeSlugs(campaignTypes, presentTypes)
  if (slugs.length > 0) {
    // One query for every fanned-out type, then bucketed — a query per type would be N round
    // trips for a palette that shows at most MAX_PER_TYPE of each.
    const rows = db
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
          inArray(entities.type, slugs),
          like(entities.name, likeQ),
          visible,
        ),
      )
      .all()

    for (const slug of slugs) fanout[slug] = []
    for (const row of rows) {
      const bucket = fanout[row.type]
      if (!bucket || bucket.length >= MAX_PER_TYPE) continue
      bucket.push({ ...row, entityType: row.type })
    }
  }

  return {
    characters: characterResults,
    locations: locationResults,
    organizations: orgResults,
    quests: questResults,
    wiki: wikiResults,
    ...fanout,
    groups,
  }
})
