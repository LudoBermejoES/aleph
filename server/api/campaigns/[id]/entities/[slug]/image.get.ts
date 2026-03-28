import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { entities } from '../../../../../db/schema/entities'
import { readFile } from 'fs/promises'
import { join } from 'path'

const extToMime: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
}

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()
  const campaign = event.context.campaign

  const entity = db.select().from(entities)
    .where(and(eq(entities.campaignId, campaignId), eq(entities.slug, slug)))
    .get()
  if (!entity) throw createError({ statusCode: 404, message: 'Entity not found' })

  if (!entity.imageUrl) {
    throw createError({ statusCode: 404, message: 'No image uploaded' })
  }

  const imageDir = join(process.cwd(), campaign.contentDir, 'entities', slug)
  let fileBuffer: Buffer | null = null
  let foundExt = '.png'
  for (const ext of ['.png', '.jpg', '.webp']) {
    try {
      fileBuffer = await readFile(join(imageDir, `image${ext}`))
      foundExt = ext
      break
    } catch {
      // try next
    }
  }

  if (!fileBuffer) throw createError({ statusCode: 404, message: 'Image file not found' })

  const mime = extToMime[foundExt] ?? 'image/png'
  setHeader(event, 'Content-Type', mime)
  setHeader(event, 'Cache-Control', 'public, max-age=3600')
  return fileBuffer
})
