import { eq } from 'drizzle-orm'
import { useDb, useSqlite } from '../../../utils/db'
import { searchEntities } from '../../../services/search'
import { entities } from '../../../db/schema/entities'
import { ROLE_LEVEL, VISIBILITY_MIN_ROLE } from '../../../utils/permissions'
import type { CampaignRole } from '../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = (query.q as string || '').trim()
  const campaignId = getRouterParam(event, 'id')!
  const role = (event.context.campaignRole || 'visitor') as CampaignRole
  const userId = event.context.user?.id

  if (!q) {
    return { results: [], query: '' }
  }

  const sqlite = useSqlite()
  const db = useDb()
  const results = searchEntities(sqlite, campaignId, q)

  // Filter by user permissions
  const roleLevel = ROLE_LEVEL[role] ?? 1
  const filtered = results.filter(r => {
    const entity = db.select({ visibility: entities.visibility, createdBy: entities.createdBy })
      .from(entities)
      .where(eq(entities.id, r.entityId))
      .get()

    if (!entity) return false
    if (entity.visibility === 'private') return entity.createdBy === userId
    if (entity.visibility === 'specific_users') return false // would need entity_specific_viewers check
    const minLevel = VISIBILITY_MIN_ROLE[entity.visibility] ?? 99
    return roleLevel >= minLevel
  })

  // Optional type filter
  const typeFilter = query.type as string | undefined
  const filteredByType = typeFilter
    ? filtered.filter(r => {
        const ent = db.select({ type: entities.type }).from(entities).where(eq(entities.id, r.entityId)).get()
        return ent?.type === typeFilter
      })
    : filtered

  // Enrich results with slug and type
  const finalResults = filteredByType.map(r => {
    const ent = db.select({ slug: entities.slug, type: entities.type })
      .from(entities)
      .where(eq(entities.id, r.entityId))
      .get()
    return { ...r, slug: ent?.slug ?? null, type: ent?.type ?? null }
  })

  return { results: finalResults, query: q }
})
