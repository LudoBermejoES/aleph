import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { sessionGroups } from '../../../../../db/schema/sessions'
import { readFile, stat } from 'fs/promises'
import { join } from 'path'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()
  const campaign = event.context.campaign

  const group = db
    .select({ id: sessionGroups.id })
    .from(sessionGroups)
    .where(and(eq(sessionGroups.campaignId, campaignId), eq(sessionGroups.slug, slug)))
    .get()
  if (!group) throw createError({ statusCode: 404, message: 'Session group not found' })

  const imageDir = join(process.cwd(), campaign.contentDir, 'session-groups', slug)

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
