import { eq } from 'drizzle-orm'
import { useDb, useSqlite } from '../../../utils/db'
import { searchEntities } from '../../../services/search'
import { entities } from '../../../db/schema/entities'
import { hasMinRole } from '../../../utils/permissions'
import type { CampaignRole } from '../../../utils/permissions'

const VISIBILITY_MIN_ROLE: Record<string, number> = {
  public: 0,
  members: 2,
  editors: 3,
  dm_only: 4,
  private: 99,
}

const ROLE_LEVEL: Record<string, number> = {
  dm: 5, co_dm: 4, editor: 3, player: 2, visitor: 1,
}

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

  return { results: filtered, query: q }
})
