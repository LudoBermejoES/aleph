import { useDb } from '../../../../../../utils/db'
import { withApiHandler } from '../../../../../../utils/api-handler'
import { hasMinRole } from '../../../../../../utils/permissions'
import { resolveReadableLocation } from '../../../../../../services/locations'
import { addImage } from '../../../../../../services/entity-images'
import { ImageUploadError, validateImageUpload } from '../../../../../../utils/image-upload'
import type { CampaignRole } from '../../../../../../utils/permissions'

export default defineEventHandler(async (event) =>
  withApiHandler(event, async () => {
    const role = (event.context.campaignRole || 'visitor') as CampaignRole
    if (!hasMinRole(role, 'editor')) {
      throw createError({ statusCode: 403, message: 'Editors or above can upload location images' })
    }

    const campaignId = getRouterParam(event, 'id')!
    const slug = getRouterParam(event, 'slug')!
    const userId = event.context.user?.id || ''
    const db = useDb()
    const campaign = event.context.campaign

    const location = await resolveReadableLocation(db, { campaignId, slug, role, userId })
    if (!location) throw createError({ statusCode: 404, message: 'Location not found' })

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

    const image = await addImage(db, {
      campaignId,
      entityId: location.id,
      slug,
      contentDir: campaign.contentDir,
      data: validated.data,
      ext: validated.ext,
      caption,
      userId,
    })

    setResponseStatus(event, 201)
    return image
  }),
)
