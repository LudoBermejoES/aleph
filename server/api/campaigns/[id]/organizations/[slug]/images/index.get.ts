import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../../utils/db'
import { withApiHandler } from '../../../../../../utils/api-handler'
import { organizations } from '../../../../../../db/schema/organizations'
import { listImages } from '../../../../../../services/entity-images'

export default defineEventHandler(async (event) =>
  withApiHandler(event, async () => {
    const campaignId = getRouterParam(event, 'id')!
    const slug = getRouterParam(event, 'slug')!
    const db = useDb()

    const org = db
      .select()
      .from(organizations)
      .where(and(eq(organizations.campaignId, campaignId), eq(organizations.slug, slug)))
      .get()
    if (!org) throw createError({ statusCode: 404, message: 'Organization not found' })
    if (!org.entityId) return []

    return listImages(db, org.entityId)
  }),
)
