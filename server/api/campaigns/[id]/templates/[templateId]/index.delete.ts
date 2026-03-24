import { eq } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { entityTemplates } from '../../../../../db/schema/entities'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'dm')) {
    throw createError({ statusCode: 403, message: 'Only DM can delete templates' })
  }

  const templateId = getRouterParam(event, 'templateId')!
  const db = useDb()

  db.delete(entityTemplates).where(eq(entityTemplates.id, templateId)).run()

  return { success: true }
})
