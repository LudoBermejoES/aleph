import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { entities } from '../../../../../db/schema/entities'
import { buildTree, layoutTree } from '../../../../../services/genealogy'

const DEFAULT_DEPTH = 3
const MAX_DEPTH = 10

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const query = getQuery(event)
  const db = useDb()

  // Parse and validate depth
  const rawDepth = query.depth
  let depth = DEFAULT_DEPTH
  if (rawDepth !== undefined) {
    const parsed = parseInt(String(rawDepth), 10)
    if (isNaN(parsed) || parsed < 1) {
      throw createError({ statusCode: 400, message: 'depth must be a positive integer' })
    }
    depth = Math.min(parsed, MAX_DEPTH)
  }

  const entity = db
    .select({ id: entities.id, name: entities.name, slug: entities.slug })
    .from(entities)
    .where(and(eq(entities.campaignId, campaignId), eq(entities.slug, slug)))
    .get()
  if (!entity) throw createError({ statusCode: 404, message: 'Character not found' })

  const { rawNodes, edges, warnings } = buildTree(entity.id, campaignId, depth, db)
  const nodes = layoutTree(rawNodes, edges)

  const focus = nodes.find((n) => n.entityId === entity.id) ?? null

  return { focus, nodes, edges, warnings }
})
