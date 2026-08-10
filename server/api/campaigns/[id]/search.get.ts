import { eq, and, inArray, type SQL } from 'drizzle-orm'
import { useDb, useSqlite } from '../../../utils/db'
import { hybridSearchEntities } from '../../../services/hybrid-search'
import { entities } from '../../../db/schema/entities'
import { ROLE_LEVEL, VISIBILITY_MIN_ROLE } from '../../../utils/permissions'
import type { CampaignRole } from '../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = ((query.q as string) || '').trim()
  const campaignId = getRouterParam(event, 'id')!
  const role = (event.context.campaignRole || 'visitor') as CampaignRole
  const userId = event.context.user?.id
  const typeFilter = query.type as string | undefined

  if (!q) {
    return { results: [], query: '' }
  }

  const sqlite = useSqlite()
  const db = useDb()
  const config = useRuntimeConfig(event)

  const { fused, lexicalSnippets } = await hybridSearchEntities(sqlite, campaignId, q, 20, {
    semanticEnabled: config.search.semanticEnabled,
  })

  if (!fused.length) return { results: [], query: q }

  const roleLevel = ROLE_LEVEL[role] ?? 1
  const entityIds = fused.map((r) => r.entityId)

  // Single batch query — replaces per-result DB lookups. Visibility/campaign
  // scoping is applied once here, to the union of both arms' matches, which
  // is equivalent to applying it identically to each arm before fusion.
  const conditions: SQL[] = [eq(entities.campaignId, campaignId), inArray(entities.id, entityIds)]
  if (typeFilter) conditions.push(eq(entities.type, typeFilter))

  const entityRows = db
    .select({
      id: entities.id,
      name: entities.name,
      slug: entities.slug,
      type: entities.type,
      visibility: entities.visibility,
      createdBy: entities.createdBy,
    })
    .from(entities)
    .where(and(...conditions))
    .all()

  const entityMap = new Map(entityRows.map((e) => [e.id, e]))

  const finalResults = fused
    .map((r) => {
      const ent = entityMap.get(r.entityId)
      if (!ent) return null

      // Visibility filtering in-memory (data already fetched)
      if (ent.visibility === 'private' && ent.createdBy !== userId) return null
      if (ent.visibility === 'specific_users') return null
      const minLevel = VISIBILITY_MIN_ROLE[ent.visibility] ?? 99
      if (roleLevel < minLevel) return null

      return {
        entityId: r.entityId,
        name: ent.name,
        snippet: lexicalSnippets.get(r.entityId) ?? '',
        score: r.score,
        arms: r.arms,
        slug: ent.slug,
        type: ent.type,
      }
    })
    .filter(Boolean)

  return { results: finalResults, query: q }
})
