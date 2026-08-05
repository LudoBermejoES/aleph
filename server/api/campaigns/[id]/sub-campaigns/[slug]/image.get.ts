import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { subCampaigns } from '../../../../../db/schema/sessions'
import { readFile, stat } from 'fs/promises'
import { join } from 'path'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()
  const campaign = event.context.campaign

  const subCampaign = db
    .select({ id: subCampaigns.id })
    .from(subCampaigns)
    .where(and(eq(subCampaigns.campaignId, campaignId), eq(subCampaigns.slug, slug)))
    .get()
  if (!subCampaign) throw createError({ statusCode: 404, message: 'Sub-campaign not found' })

  const imageDir = join(process.cwd(), campaign.contentDir, 'sub-campaigns', slug)

  for (const ext of ['.png', '.jpg', '.webp']) {
    const imagePath = join(imageDir, `image${ext}`)
    try {
      await stat(imagePath)
      const data = await readFile(imagePath)
      const mime = ext === '.jpg' ? 'image/jpeg' : ext === '.png' ? 'image/png' : 'image/webp'
      setResponseHeader(event, 'Content-Type', mime)
      setResponseHeader(event, 'Cache-Control', 'public, max-age=3600')
      return data
    } catch {
      /* try next */
    }
  }

  throw createError({ statusCode: 404, message: 'Image not found' })
})
