import { useDb } from '../../../../utils/db'
import { buildGraphForCampaign } from '../../../../services/graph-builder'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const role = (event.context.campaignRole || 'visitor') as CampaignRole
  const db = useDb()

  return buildGraphForCampaign(db, campaignId, role)
})
