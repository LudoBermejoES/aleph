import { useDb } from '../../../../../../utils/db'
import { withApiHandler } from '../../../../../../utils/api-handler'
import { hasMinRole } from '../../../../../../utils/permissions'
import { resolveReadableEntity } from '../../../../../../services/entities'
import {
  addImage,
  adoptLegacyEntityImage,
  resolveEntityImageKind,
} from '../../../../../../services/entity-images'
import { ImageUploadError, validateImageUpload } from '../../../../../../utils/image-upload'
import type { CampaignRole } from '../../../../../../utils/permissions'

export default defineEventHandler(async (event) =>
  withApiHandler(event, async () => {
    const role = (event.context.campaignRole || 'visitor') as CampaignRole
    if (!hasMinRole(role, 'editor')) {
      throw createError({
        statusCode: 403,
        message: 'Editors or above can upload entity images',
      })
    }

    const campaignId = getRouterParam(event, 'id')!
    const slug = getRouterParam(event, 'slug')!
    const userId = event.context.user?.id || ''
    const db = useDb()
    const campaign = event.context.campaign

    const entity = await resolveReadableEntity(db, { campaignId, slug, role, userId })
    if (!entity) throw createError({ statusCode: 404, message: 'Entity not found' })

    const formData = await readMultipartFormData(event)
    if (!formData || formData.length === 0) {
      throw createError({ statusCode: 400, message: 'No file uploaded' })
    }

    let validated
    try {
      validated = validateImageUpload(formData.find((f) => f.name === 'image'))
    } catch (err) {
      if (err instanceof ImageUploadError) {
        throw createError({ statusCode: 400, message: err.message })
      }
      throw err
    }

    const captionPart = formData.find((f) => f.name === 'caption')
    const caption = captionPart?.data ? captionPart.data.toString('utf-8') : null

    const kind = resolveEntityImageKind(db, entity)

    // An entity whose image predates the gallery has `image_url` set and no rows at all. Adopt it
    // as the primary FIRST, so this upload appends beside it instead of displacing it (design D6 /
    // task 1.6). A no-op for every other entity.
    if (kind === 'entity') {
      await adoptLegacyEntityImage(db, {
        campaignId,
        entityId: entity.id,
        slug,
        contentDir: campaign.contentDir,
        imageUrl: entity.imageUrl ?? null,
        userId,
      })
    }

    const image = await addImage(db, {
      campaignId,
      entityId: entity.id,
      slug,
      contentDir: campaign.contentDir,
      data: validated.data,
      ext: validated.ext,
      caption,
      userId,
      entityKind: kind,
    })

    setResponseStatus(event, 201)
    return image
  }),
)
