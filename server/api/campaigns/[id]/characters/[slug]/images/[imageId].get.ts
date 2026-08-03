import { readFile } from 'fs/promises'
import { extname, join } from 'path'
import { useDb } from '../../../../../../utils/db'
import { withApiHandler } from '../../../../../../utils/api-handler'
import { resolveReadableCharacter } from '../../../../../../services/characters'
import { characterGalleryDir, getImage } from '../../../../../../services/entity-images'
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

    const { entity } = await resolveReadableCharacter(db, campaignId, slug, userId, role)

    const image = getImage(db, entity.id, imageId)
    if (!image) throw createError({ statusCode: 404, message: 'Image not found' })

    const filePath = join(characterGalleryDir(campaign.contentDir, slug), image.filename)
    let fileBuffer: Buffer
    try {
      fileBuffer = await readFile(filePath)
    } catch {
      throw createError({ statusCode: 404, message: 'Image file not found' })
    }

    const mime = EXT_TO_MIME[extname(image.filename).toLowerCase()] ?? 'image/png'
    setHeader(event, 'Content-Type', mime)
    setHeader(event, 'Cache-Control', 'public, max-age=31536000')
    return fileBuffer
  }),
)
