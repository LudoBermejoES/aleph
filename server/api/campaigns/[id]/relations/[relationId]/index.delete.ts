import { eq } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { entityRelations } from '../../../../../db/schema/relations'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'co_dm')) throw createError({ statusCode: 403, message: 'Co-DM or above can delete relations' })

  const relationId = getRouterParam(event, 'relationId')!
  const db = useDb()

  db.delete(entityRelations).where(eq(entityRelations.id, relationId)).run()
  return { success: true }
})
