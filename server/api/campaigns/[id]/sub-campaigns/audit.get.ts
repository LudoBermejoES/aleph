import { useDb } from '../../../../utils/db'
import { findIncoherentSessions } from '../../../../services/sub-campaigns'

/**
 * Sessions whose arc names a different storyline than the session does.
 *
 * READ-ONLY, and the repair lives in a sibling POST so that no GET can ever mutate. The query
 * itself is in the service layer because — now that the 422 and the arc-move cascade are in —
 * no API route can create this state any more, so it can only be exercised from a seeded DB.
 */
export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const rows = findIncoherentSessions(useDb(), campaignId)
  return { incoherent: rows, total: rows.length }
})
