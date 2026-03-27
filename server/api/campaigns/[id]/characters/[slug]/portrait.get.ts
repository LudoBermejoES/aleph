import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { entities } from '../../../../../db/schema/entities'
import { characters } from '../../../../../db/schema/characters'
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
  if (!entity) throw createError({ statusCode: 404, message: 'Character not found' })

  const character = db.select().from(characters)
    .where(eq(characters.entityId, entity.id))
    .get()
  if (!character?.portraitUrl) {
    throw createError({ statusCode: 404, message: 'No portrait uploaded' })
  }

  const portraitDir = join(process.cwd(), campaign.contentDir, 'characters', slug)
  // Find whichever extension was stored
  let fileBuffer: Buffer | null = null
  let foundExt = '.png'
  for (const ext of ['.png', '.jpg', '.webp']) {
    try {
      fileBuffer = await readFile(join(portraitDir, `portrait${ext}`))
      foundExt = ext
      break
    } catch {
      // try next
    }
  }

  if (!fileBuffer) throw createError({ statusCode: 404, message: 'Portrait file not found' })

  const mime = extToMime[foundExt] ?? 'image/png'
  setHeader(event, 'Content-Type', mime)
  setHeader(event, 'Cache-Control', 'public, max-age=3600')
  return fileBuffer
})
