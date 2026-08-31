import { useDb } from '../../../../../../utils/db'
import { withApiHandler } from '../../../../../../utils/api-handler'
import { resolveReadableEntity } from '../../../../../../services/entities'
import { listImages } from '../../../../../../services/entity-images'
import type { CampaignRole } from '../../../../../../utils/permissions'

export default defineEventHandler(async (event) =>
  withApiHandler(event, async () => {
    const campaignId = getRouterParam(event, 'id')!
    const slug = getRouterParam(event, 'slug')!
    const role = (event.context.campaignRole || 'visitor') as CampaignRole
    const userId = event.context.user?.id || ''
    const db = useDb()

    const entity = await resolveReadableEntity(db, { campaignId, slug, role, userId })
    if (!entity) throw createError({ statusCode: 404, message: 'Entity not found' })

    return listImages(db, entity.id)
  }),
)
