import { eq, and, asc, inArray } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { entities, entityTags, tags } from '../../../../../db/schema/entities'
import { entityImages } from '../../../../../db/schema/entity-images'
import { characters } from '../../../../../db/schema/characters'
import { organizations } from '../../../../../db/schema/organizations'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

// GET /api/campaigns/:id/diagrams/entities/batch?ids=id1,id2,...
// Returns Record<entityId, { id, name, type, slug, portraitUrl, tags, status, images }>
// Requires player+ role. Unknown IDs silently omitted.
//
// `portraitUrl` is the entity's MAIN image, resolved SPECIALISED-COLUMN-FIRST:
//
//   1. characters.portrait_url      (a character entity)
//   2. organizations.image_url      (an organization entity)
//   3. entities.image_url           (everything else, and the legacy fallback)
//
// The order is not arbitrary and it is not new: `server/services/maps.ts` already resolves the
// same question for map pins with the same precedence, adjudicated in
// `move-pins-and-resolve-entity-images/design.md` D3, and it deliberately does NOT switch on
// `entities.type` (a location can carry both a gallery image and `entities.image_url`, and a
// campaign's custom entity type matches no branch). The reason the specialised column wins:
// `syncPrimaryImageUrl()` maintains it inside the gallery's own transaction, whereas an
// organization's or character's `entities.image_url` can only have been written by the legacy
// single-file `entities/:slug/image` route — an unsynced second writer. So when the two disagree,
// the transactionally-maintained one is the truth. (Today they never disagree: 0 of the 109
// organizations with a crest have `entities.image_url` set at all.)
//
// `images` is the entity's gallery in `sortOrder` order, so ONE request serves both readers:
// hydration resolves a shape's `imageOverrideId` against it, and the picker offers the choices
// (design D3). It rides the SAME `dm_only` filter as everything else here — the list is computed
// from `visibleIds`, never from the requested ids, because an image list is a disclosure too.
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

  // Fetch organization rows for organization entities.
  //
  // An organization's main image lives in `organizations.image_url`, NOT in `entities.image_url` —
  // that is what `syncPrimaryImageUrl()` mirrors the gallery primary into, and it is the column the
  // organization gallery has always owned. This endpoint used to read only `characters` and
  // `entities`, so EVERY organization's crest resolved to null here: measured 109 of 109
  // organizations that have a crest, with `entities.image_url` NULL on all 109. It went unnoticed
  // because nothing consumed it until hydration started writing `crestUrl` — at which point a null
  // stopped meaning "leave the card alone" and started meaning "erase the crest", and the erasure
  // was persisted.
  const orgRows = db
    .select({
      entityId: organizations.entityId,
      imageUrl: organizations.imageUrl,
    })
    .from(organizations)
    .innerJoin(entities, eq(organizations.entityId, entities.id))
    .where(and(eq(entities.campaignId, campaignId), inArray(organizations.entityId, visibleIds)))
    .all()

  const orgByEntityId = new Map(
    orgRows.flatMap((o) => (o.entityId ? [[o.entityId, o] as const] : [])),
  )

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

  // Gallery images for visible entities, in display order (sortOrder, then createdAt as the
  // deterministic tiebreak — the same order `listImages()` returns).
  const imageRows = db
    .select({
      entityId: entityImages.entityId,
      id: entityImages.id,
      url: entityImages.url,
    })
    .from(entityImages)
    .where(inArray(entityImages.entityId, visibleIds))
    .orderBy(asc(entityImages.sortOrder), asc(entityImages.createdAt))
    .all()

  const imagesByEntityId = new Map<string, { id: string; url: string }[]>()
  for (const row of imageRows) {
    const list = imagesByEntityId.get(row.entityId) ?? []
    list.push({ id: row.id, url: row.url })
    imagesByEntityId.set(row.entityId, list)
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
      images: { id: string; url: string }[]
    }
  > = {}

  for (const entity of visibleEntities) {
    const charData = charByEntityId.get(entity.id)
    const orgData = orgByEntityId.get(entity.id)
    result[entity.id] = {
      id: entity.id,
      name: entity.name,
      type: entity.type,
      slug: entity.slug,
      portraitUrl: charData?.portraitUrl ?? orgData?.imageUrl ?? entity.imageUrl ?? null,
      tags: tagsByEntityId.get(entity.id) ?? [],
      status: charData?.status ?? null,
      images: imagesByEntityId.get(entity.id) ?? [],
    }
  }

  return result
})
