import { randomUUID, randomBytes } from 'crypto'
import { useDb } from '../../../utils/db'
import { campaignInvitations } from '../../../db/schema/campaign-members'
import { hasMinRole } from '../../../utils/permissions'
import type { CampaignRole } from '../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'co_dm')) {
    throw createError({ statusCode: 403, message: 'Only DM or Co-DM can invite members' })
  }

  const body = await readBody(event)
  const campaignId = getRouterParam(event, 'id')!
  const db = useDb()

  const token = randomBytes(32).toString('hex')
  const inviteRole = body.role || 'player'
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  db.insert(campaignInvitations).values({
    id: randomUUID(),
    campaignId,
    token,
    role: inviteRole,
    createdBy: event.context.user.id,
    expiresAt,
  }).run()

  return { token, role: inviteRole, expiresAt }
})
