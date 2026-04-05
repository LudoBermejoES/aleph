import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { characterFolders, characters } from '../../../../../db/schema/characters'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'co_dm')) {
    throw createError({ statusCode: 403, message: 'Co-DM or above can delete character folders' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const folderId = getRouterParam(event, 'folderId')!
  const db = useDb()

  const folder = db
    .select()
    .from(characterFolders)
    .where(and(eq(characterFolders.campaignId, campaignId), eq(characterFolders.id, folderId)))
    .get()
  if (!folder) throw createError({ statusCode: 404, message: 'Character folder not found' })

  db.update(characters).set({ folderId: null }).where(eq(characters.folderId, folder.id)).run()
  db.delete(characterFolders).where(eq(characterFolders.id, folder.id)).run()

  return { success: true }
})
