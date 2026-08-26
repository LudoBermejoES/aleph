import { useDb } from '../../../../../../utils/db'
import { getPinsWithEntity, getMapForRole } from '../../../../../../services/maps'
import type { CampaignRole } from '../../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const role = (event.context.campaignRole || 'visitor') as CampaignRole
  const userId = event.context.user?.id || ''
  const db = useDb()

  const map = getMapForRole(db, campaignId, slug, role)
  if (!map) throw createError({ statusCode: 404, message: 'Map not found' })

  return await getPinsWithEntity(db, map.id, role, userId)
})
