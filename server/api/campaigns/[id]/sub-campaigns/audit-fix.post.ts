import { useDb } from '../../../../utils/db'
import { repairIncoherentSessions } from '../../../../services/sub-campaigns'
import { hasMinRole } from '../../../../utils/permissions'
import type { CampaignRole } from '../../../../utils/permissions'

/** `co_dm` rather than `editor`: one call can rewrite many rows at once. */
export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'co_dm')) {
    throw createError({
      statusCode: 403,
      message: 'Co-DMs or above can repair sub-campaign incoherence',
    })
  }
  return repairIncoherentSessions(useDb(), getRouterParam(event, 'id')!)
})
