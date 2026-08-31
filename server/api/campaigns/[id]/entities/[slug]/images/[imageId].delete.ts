import { useDb } from '../../../../../../utils/db'
import { withApiHandler } from '../../../../../../utils/api-handler'
import { hasMinRole } from '../../../../../../utils/permissions'
import { resolveReadableEntity } from '../../../../../../services/entities'
import { deleteImage, resolveEntityImageKind } from '../../../../../../services/entity-images'
import type { CampaignRole } from '../../../../../../utils/permissions'

export default defineEventHandler(async (event) =>
  withApiHandler(event, async () => {
    const role = (event.context.campaignRole || 'visitor') as CampaignRole
    if (!hasMinRole(role, 'editor')) {
      throw createError({
        statusCode: 403,
        message: 'Editors or above can delete entity images',
      })
    }

    const campaignId = getRouterParam(event, 'id')!
    const slug = getRouterParam(event, 'slug')!
    const imageId = getRouterParam(event, 'imageId')!
    const userId = event.context.user?.id || ''
    const db = useDb()
    const campaign = event.context.campaign

    const entity = await resolveReadableEntity(db, { campaignId, slug, role, userId })
    if (!entity) throw createError({ statusCode: 404, message: 'Entity not found' })

    const removed = await deleteImage(db, {
      entityId: entity.id,
      imageId,
      slug,
      contentDir: campaign.contentDir,
      entityKind: resolveEntityImageKind(db, entity),
    })
    if (!removed) throw createError({ statusCode: 404, message: 'Image not found' })

    setResponseStatus(event, 204)
    return null
  }),
)
