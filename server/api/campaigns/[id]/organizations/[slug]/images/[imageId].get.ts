import { readFile } from 'fs/promises'
import { extname, join } from 'path'
import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../../utils/db'
import { withApiHandler } from '../../../../../../utils/api-handler'
import { organizations } from '../../../../../../db/schema/organizations'
import { orgGalleryDir, getImage } from '../../../../../../services/entity-images'
import { EXT_TO_MIME } from '../../../../../../utils/image-upload'

export default defineEventHandler(async (event) =>
  withApiHandler(event, async () => {
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

    const image = getImage(db, org.entityId, imageId)
    if (!image) throw createError({ statusCode: 404, message: 'Image not found' })

    const filePath = join(orgGalleryDir(campaign.contentDir, slug), image.filename)
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
