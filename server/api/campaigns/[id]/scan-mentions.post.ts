import { useDb } from '../../../utils/db'
import { scanCampaignMentions } from '../../../services/mention-scanner'
import { hasMinRole } from '../../../utils/permissions'
import { logger } from '../../../utils/logger'
import type { CampaignRole } from '../../../utils/permissions'

/**
 * Trigger a background mention scan for the campaign.
 * For large campaigns (>20 entities), this runs asynchronously.
 * DM only.
 */
export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'dm')) {
    throw createError({ statusCode: 403, message: 'Only DM can trigger mention scans' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const db = useDb()

  // Run scan in background (non-blocking)
  const scanPromise = scanCampaignMentions(db, campaignId)
    .then(result => {
      logger.info('Campaign mention scan completed', { campaignId, ...result })
    })
    .catch(err => {
      logger.error('Campaign mention scan failed', { campaignId, error: err })
    })

  // Don't await — return immediately
  // Store the promise to prevent garbage collection
  ;(globalThis as any).__pendingScans ??= []
  ;(globalThis as any).__pendingScans.push(scanPromise)

  return { status: 'scanning', message: 'Mention scan started in background' }
})
