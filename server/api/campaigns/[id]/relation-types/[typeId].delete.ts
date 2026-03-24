import { eq } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { relationTypes } from '../../../../db/schema/relations'
import { hasMinRole } from '../../../../utils/permissions'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'dm')) throw createError({ statusCode: 403, message: 'Only DM can delete relation types' })

  const typeId = getRouterParam(event, 'typeId')!
  const db = useDb()

  const type = db.select().from(relationTypes).where(eq(relationTypes.id, typeId)).get()
  if (!type) throw createError({ statusCode: 404, message: 'Relation type not found' })
  if (type.isBuiltin) throw createError({ statusCode: 403, message: 'Cannot delete built-in relation types' })

  db.delete(relationTypes).where(eq(relationTypes.id, typeId)).run()
  return { success: true }
})
