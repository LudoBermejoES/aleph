import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../../../../utils/db'
import { maps } from '../../../../../../../../db/schema/maps'
import { readFile, stat } from 'fs/promises'
import { join } from 'path'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const z = getRouterParam(event, 'z')!
  const x = getRouterParam(event, 'x')!
  const y = getRouterParam(event, 'y')!
  const db = useDb()
  const campaign = event.context.campaign

  const map = db.select().from(maps)
    .where(and(eq(maps.campaignId, campaignId), eq(maps.slug, slug)))
    .get()
  if (!map) throw createError({ statusCode: 404, message: 'Map not found' })

  const tilePath = join(process.cwd(), campaign.contentDir, 'maps', slug, 'tiles', z, x, `${y}.png`)

  try {
    await stat(tilePath)
    const data = await readFile(tilePath)
    setResponseHeader(event, 'Content-Type', 'image/png')
    setResponseHeader(event, 'Cache-Control', 'public, max-age=604800')
    return data
  } catch {
    // Return transparent 256x256 PNG for missing tiles
    setResponseHeader(event, 'Content-Type', 'image/png')
    return Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAABJRElEQkSuQmCC', 'base64')
  }
})
