import { eq } from 'drizzle-orm'
import { useDb } from '../../../../../../../utils/db'
import { consequences } from '../../../../../../../db/schema/sessions'
import { hasMinRole } from '../../../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'co_dm')) {
    throw createError({ statusCode: 403, message: 'Co-DM or above can reveal consequences' })
  }

  const body = await readBody(event)
  const { consequenceId, revealed } = body
  const db = useDb()

  if (!consequenceId) throw createError({ statusCode: 400, message: 'consequenceId required' })

  db.update(consequences)
    .set({ revealed: revealed ?? true })
    .where(eq(consequences.id, consequenceId))
    .run()

  return { success: true }
})
