import { eq } from 'drizzle-orm'
import { useDb } from '../../../../../../../utils/db'
import { mapPins } from '../../../../../../../db/schema/maps'
import { hasMinRole } from '../../../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) throw createError({ statusCode: 403, message: 'Editors or above can delete pins' })

  const pinId = getRouterParam(event, 'pinId')!
  const db = useDb()

  db.delete(mapPins).where(eq(mapPins.id, pinId)).run()
  return { success: true }
})
