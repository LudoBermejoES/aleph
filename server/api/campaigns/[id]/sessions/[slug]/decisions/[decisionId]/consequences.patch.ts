import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDb } from '../../../../../../../utils/db'
import { validateBody } from '../../../../../../../utils/validate'
import { consequences } from '../../../../../../../db/schema/sessions'
import { hasMinRole } from '../../../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'co_dm')) {
    throw createError({ statusCode: 403, message: 'Co-DM or above can reveal consequences' })
  }

  const consequencePatchSchema = z.object({
    consequenceId: z.string(),
    revealed: z.boolean().optional(),
  })
  const body = await validateBody(event, consequencePatchSchema)
  const { consequenceId, revealed } = body
  const db = useDb()

  db.update(consequences)
    .set({ revealed: revealed ?? true })
    .where(eq(consequences.id, consequenceId))
    .run()

  return { success: true }
})
