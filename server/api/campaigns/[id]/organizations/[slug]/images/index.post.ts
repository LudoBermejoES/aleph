import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../../utils/db'
import { withApiHandler } from '../../../../../../utils/api-handler'
import { hasMinRole } from '../../../../../../utils/permissions'
import { organizations } from '../../../../../../db/schema/organizations'
import { addImage } from '../../../../../../services/entity-images'
import { ImageUploadError, validateImageUpload } from '../../../../../../utils/image-upload'
import type { CampaignRole } from '../../../../../../utils/permissions'

export default defineEventHandler(async (event) =>
  withApiHandler(event, async () => {
    const role = (event.context.campaignRole || 'visitor') as CampaignRole
    if (!hasMinRole(role, 'editor')) {
      throw createError({
        statusCode: 403,
        message: 'Editors or above can upload organization images',
      })
    }

    const campaignId = getRouterParam(event, 'id')!
    const slug = getRouterParam(event, 'slug')!
    const userId = event.context.user?.id || ''
    const db = useDb()
    const campaign = event.context.campaign

    const org = db
      .select()
      .from(organizations)
      .where(and(eq(organizations.campaignId, campaignId), eq(organizations.slug, slug)))
      .get()
    if (!org) throw createError({ statusCode: 404, message: 'Organization not found' })
    if (!org.entityId)
      throw createError({ statusCode: 422, message: 'Organization has no entity record' })

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
      entityId: org.entityId,
      slug,
      contentDir: campaign.contentDir,
      data: validated.data,
      ext: validated.ext,
      caption,
      userId,
      entityKind: 'organization',
    })

    setResponseStatus(event, 201)
    return image
  }),
)
