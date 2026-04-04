import { eq } from 'drizzle-orm'
import { useDb } from '../../../../../../../utils/db'
import { abilities } from '../../../../../../../db/schema/characters'
import { hasMinRole } from '../../../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can delete abilities' })
  }

  const abilityId = getRouterParam(event, 'abilityId')!
  const db = useDb()

  const ability = db.select().from(abilities).where(eq(abilities.id, abilityId)).get()
  if (!ability) throw createError({ statusCode: 404, message: 'Ability not found' })

  db.delete(abilities).where(eq(abilities.id, ability.id)).run()

  return { success: true }
})
