import { z } from 'zod'
import { randomUUID } from 'crypto'
import { useDb } from '../../../../utils/db'
import { validateBody } from '../../../../utils/validate'
import { characterFolders } from '../../../../db/schema/characters'
import { hasMinRole } from '../../../../utils/permissions'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can create folders' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const folderSchema = z.object({
    name: z.string().min(1),
    parentFolderId: z.string().optional(),
    sortOrder: z.number().optional(),
  })
  const body = await validateBody(event, folderSchema)
  const db = useDb()

  const id = randomUUID()
  db.insert(characterFolders)
    .values({
      id,
      campaignId,
      name: body.name,
      parentFolderId: body.parentFolderId || null,
      sortOrder: body.sortOrder || 0,
    })
    .run()

  return { id, name: body.name }
})
