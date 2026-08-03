import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../../utils/db'
import { withApiHandler } from '../../../../../../utils/api-handler'
import { hasMinRole } from '../../../../../../utils/permissions'
import { organizations } from '../../../../../../db/schema/organizations'
import { deleteImage } from '../../../../../../services/entity-images'
import type { CampaignRole } from '../../../../../../utils/permissions'

export default defineEventHandler(async (event) =>
  withApiHandler(event, async () => {
    const role = (event.context.campaignRole || 'visitor') as CampaignRole
    if (!hasMinRole(role, 'editor')) {
      throw createError({
        statusCode: 403,
        message: 'Editors or above can delete organization images',
      })
    }

    const campaignId = getRouterParam(event, 'id')!
    const slug = getRouterParam(event, 'slug')!
    const imageId = getRouterParam(event, 'imageId')!
    const db = useDb()
    const campaign = event.context.campaign

    const org = db
      .select()
      .from(organizations)
      .where(and(eq(organizations.campaignId, campaignId), eq(organizations.slug, slug)))
      .get()
    if (!org) throw createError({ statusCode: 404, message: 'Organization not found' })
    if (!org.entityId) throw createError({ statusCode: 404, message: 'Image not found' })

    const removed = await deleteImage(db, {
      entityId: org.entityId,
      imageId,
      slug,
      contentDir: campaign.contentDir,
      entityKind: 'organization',
    })
    if (!removed) throw createError({ statusCode: 404, message: 'Image not found' })

    setResponseStatus(event, 204)
    return null
  }),
)
