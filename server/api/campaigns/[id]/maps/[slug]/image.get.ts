import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { maps } from '../../../../../db/schema/maps'
import { readFile, stat } from 'fs/promises'
import { join } from 'path'
import { createReadStream } from 'fs'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()
  const campaign = event.context.campaign

  const map = db.select().from(maps)
    .where(and(eq(maps.campaignId, campaignId), eq(maps.slug, slug)))
    .get()
  if (!map) throw createError({ statusCode: 404, message: 'Map not found' })

  const contentDir = join(process.cwd(), campaign.contentDir, 'maps', slug)

  // Find the original image
  const extensions = ['.png', '.jpg', '.jpeg', '.webp']
  for (const ext of extensions) {
    const imagePath = join(contentDir, `original${ext}`)
    try {
      await stat(imagePath)
      const data = await readFile(imagePath)
      const mimeMap: Record<string, string> = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp',
      }
      setResponseHeader(event, 'Content-Type', mimeMap[ext] || 'application/octet-stream')
      setResponseHeader(event, 'Cache-Control', 'public, max-age=86400')
      return data
    } catch {
      continue
    }
  }

  throw createError({ statusCode: 404, message: 'Map image not found' })
})
