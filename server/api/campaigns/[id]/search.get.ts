import { useSqlite } from '../../../utils/db'
import { searchEntities } from '../../../services/search'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = (query.q as string || '').trim()
  const campaignId = getRouterParam(event, 'id')!

  if (!q) {
    return { results: [], query: '' }
  }

  const sqlite = useSqlite()
  const results = searchEntities(sqlite, campaignId, q)

  // TODO: filter by user permissions (requires entities table from wiki-core)

  return { results, query: q }
})
