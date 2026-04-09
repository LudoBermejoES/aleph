import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { organizations } from '../../../../../db/schema/organizations'
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

  const org = db
    .select()
    .from(organizations)
    .where(and(eq(organizations.campaignId, campaignId), eq(organizations.slug, slug)))
    .get()
  if (!org) throw createError({ statusCode: 404, message: 'Organization not found' })

  if (!org.imageUrl) {
    throw createError({ statusCode: 404, message: 'No image uploaded' })
  }

  const imageDir = join(process.cwd(), campaign.contentDir, 'organizations', slug)
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
