import { randomUUID } from 'crypto'
import { useDb } from '../../../../utils/db'
import { characterFolders } from '../../../../db/schema/characters'
import { hasMinRole } from '../../../../utils/permissions'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can create folders' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const body = await readBody(event)
  const db = useDb()

  const id = randomUUID()
  db.insert(characterFolders).values({
    id,
    campaignId,
    name: body.name,
    parentFolderId: body.parentFolderId || null,
    sortOrder: body.sortOrder || 0,
  }).run()

  return { id, name: body.name }
})
