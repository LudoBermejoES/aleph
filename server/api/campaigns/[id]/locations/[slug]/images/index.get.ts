import { useDb } from '../../../../../../utils/db'
import { withApiHandler } from '../../../../../../utils/api-handler'
import { resolveReadableLocation } from '../../../../../../services/locations'
import { listImages } from '../../../../../../services/entity-images'
import type { CampaignRole } from '../../../../../../utils/permissions'

export default defineEventHandler(async (event) =>
  withApiHandler(event, async () => {
    const campaignId = getRouterParam(event, 'id')!
    const slug = getRouterParam(event, 'slug')!
    const role = (event.context.campaignRole || 'visitor') as CampaignRole
    const userId = event.context.user?.id || ''
    const db = useDb()

    const location = await resolveReadableLocation(db, { campaignId, slug, role, userId })
    if (!location) throw createError({ statusCode: 404, message: 'Location not found' })

    return listImages(db, location.id)
  }),
)
