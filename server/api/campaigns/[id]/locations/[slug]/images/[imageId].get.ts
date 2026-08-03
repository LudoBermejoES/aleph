import { readFile } from 'fs/promises'
import { extname, join } from 'path'
import { useDb } from '../../../../../../utils/db'
import { withApiHandler } from '../../../../../../utils/api-handler'
import { resolveReadableLocation } from '../../../../../../services/locations'
import { galleryDir, getImage } from '../../../../../../services/entity-images'
import { EXT_TO_MIME } from '../../../../../../utils/image-upload'
import type { CampaignRole } from '../../../../../../utils/permissions'

export default defineEventHandler(async (event) =>
  withApiHandler(event, async () => {
    const campaignId = getRouterParam(event, 'id')!
    const slug = getRouterParam(event, 'slug')!
    const imageId = getRouterParam(event, 'imageId')!
    const role = (event.context.campaignRole || 'visitor') as CampaignRole
    const userId = event.context.user?.id || ''
    const db = useDb()
    const campaign = event.context.campaign

    const location = await resolveReadableLocation(db, { campaignId, slug, role, userId })
    if (!location) throw createError({ statusCode: 404, message: 'Location not found' })

    // Scoped by entity id, so an imageId belonging to another location is a 404, not a leak.
    const image = getImage(db, location.id, imageId)
    if (!image) throw createError({ statusCode: 404, message: 'Image not found' })

    const filePath = join(galleryDir(campaign.contentDir, slug), image.filename)
    let fileBuffer: Buffer
    try {
      fileBuffer = await readFile(filePath)
    } catch {
      // The row is the truth; a missing file is a 404, never a 500.
      throw createError({ statusCode: 404, message: 'Image file not found' })
    }

    const mime = EXT_TO_MIME[extname(image.filename).toLowerCase()] ?? 'image/png'
    setHeader(event, 'Content-Type', mime)
    // A uuid URL addresses one immutable file, so it can be cached for a year.
    setHeader(event, 'Cache-Control', 'public, max-age=31536000')
    return fileBuffer
  }),
)
