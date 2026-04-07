import { useDb } from '../../../utils/db'
import { hasMinRole } from '../../../utils/permissions'
import { buildCampaignExportZip } from '../../../services/campaign-export'
import type { CampaignRole } from '../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'co_dm')) {
    throw createError({ statusCode: 403, message: 'DM or Co-DM required to export campaign data' })
  }

  const campaign = event.context.campaign
  if (!campaign) {
    throw createError({ statusCode: 404, message: 'Campaign not found' })
  }

  const db = useDb()
  const query = getQuery(event)
  const includeParam = query.include as string | undefined
  const include = includeParam
    ? includeParam
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined

  const zipBuffer = await buildCampaignExportZip(db, {
    campaignId: campaign.id,
    include,
  })

  const date = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const filename = `campaign-${campaign.slug}-export-${date}.zip`

  setHeader(event, 'Content-Type', 'application/zip')
  setHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)

  return send(event, zipBuffer)
})
