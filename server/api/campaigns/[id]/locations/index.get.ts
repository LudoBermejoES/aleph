import { eq, and, like, sql, inArray } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { entities } from '../../../../db/schema/entities'
import { characters } from '../../../../db/schema/characters'
import { buildVisibilityFilter } from '../../../../utils/permissions'
import { safeReadEntityFile } from '../../../../utils/content-helpers'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const query = getQuery(event)
  const db = useDb()
  const role = (event.context.campaignRole || 'visitor') as CampaignRole
  const userId = event.context.user?.id || ''

  const parentId = query.parentId as string | undefined
  const subtype = query.subtype as string | undefined
  const search = query.search as string | undefined

  const conditions = [
    eq(entities.campaignId, campaignId),
    eq(entities.type, 'location'),
  ]

  if (parentId) conditions.push(eq(entities.parentId, parentId))
  else if (query.parentId === '') conditions.push(sql`${entities.parentId} IS NULL`)

  if (search) conditions.push(like(entities.name, `%${search}%`))

  // RBAC visibility filter
  buildVisibilityFilter(role, userId, conditions, entities.visibility, entities.createdBy)

  const results = db.select().from(entities)
    .where(and(...conditions))
    .orderBy(entities.name)
    .all()

  // Filter by subtype in JS (stored in file frontmatter, not DB column)
  // and enrich with childCount + inhabitantCount
  const allLocations = db.select({ id: entities.id, parentId: entities.parentId })
    .from(entities)
    .where(and(eq(entities.campaignId, campaignId), eq(entities.type, 'location')))
    .all()

  const childCountMap = new Map<string, number>()
  for (const loc of allLocations) {
    if (loc.parentId) {
      childCountMap.set(loc.parentId, (childCountMap.get(loc.parentId) ?? 0) + 1)
    }
  }

  const allChars = db.select({ locationEntityId: characters.locationEntityId })
    .from(characters)
    .all()
  const inhabitantCountMap = new Map<string, number>()
  for (const c of allChars) {
    if (c.locationEntityId) {
      inhabitantCountMap.set(c.locationEntityId, (inhabitantCountMap.get(c.locationEntityId) ?? 0) + 1)
    }
  }

  // Build parent name map
  const parentIds = [...new Set(results.map(r => r.parentId).filter(Boolean))] as string[]
  const parentMap = new Map<string, string>()
  if (parentIds.length > 0) {
    const parents = db.select({ id: entities.id, name: entities.name })
      .from(entities)
      .where(inArray(entities.id, parentIds))
      .all()
    for (const p of parents) parentMap.set(p.id, p.name)
  }

  // Read subtypes from files in parallel
  const subtypeMap = new Map<string, string>()
  await Promise.all(results.map(async (loc) => {
    const file = await safeReadEntityFile(loc.filePath)
    subtypeMap.set(loc.id, (file?.frontmatter?.fields as any)?.subtype ?? 'other')
  }))

  const enriched = results.map((loc) => {
    return {
      id: loc.id,
      name: loc.name,
      slug: loc.slug,
      subtype: subtypeMap.get(loc.id) ?? 'other',
      parentId: loc.parentId,
      parentName: loc.parentId ? (parentMap.get(loc.parentId) ?? null) : null,
      visibility: loc.visibility,
      updatedAt: loc.updatedAt,
      childCount: childCountMap.get(loc.id) ?? 0,
      inhabitantCount: inhabitantCountMap.get(loc.id) ?? 0,
    }
  })

  // Apply subtype filter now that we have the values
  if (subtype) {
    return enriched.filter(l => l.subtype === subtype)
  }
  return enriched
})
