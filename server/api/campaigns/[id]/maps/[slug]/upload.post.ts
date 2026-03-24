import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { maps } from '../../../../../db/schema/maps'
import { hasMinRole } from '../../../../../utils/permissions'
import { validateMapImage, needsTiling } from '../../../../../services/maps'
import { writeFile, mkdir } from 'fs/promises'
import { join, extname } from 'path'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can upload map images' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()
  const campaign = event.context.campaign

  const map = db.select().from(maps)
    .where(and(eq(maps.campaignId, campaignId), eq(maps.slug, slug)))
    .get()
  if (!map) throw createError({ statusCode: 404, message: 'Map not found' })

  // Read multipart form data
  const formData = await readMultipartFormData(event)
  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, message: 'No file uploaded' })
  }

  const file = formData.find(f => f.name === 'image')
  if (!file || !file.data) {
    throw createError({ statusCode: 400, message: 'Image file is required (field name: "image")' })
  }

  // Validate
  const validation = validateMapImage({
    mimetype: file.type || 'application/octet-stream',
    size: file.data.length,
  })
  if (!validation.valid) {
    throw createError({ statusCode: 400, message: validation.error })
  }

  // Store file
  const ext = extname(file.filename || '.png') || '.png'
  const contentDir = join(process.cwd(), campaign.contentDir, 'maps', slug)
  await mkdir(contentDir, { recursive: true })
  const imagePath = join(contentDir, `original${ext}`)
  await writeFile(imagePath, file.data)

  // Get dimensions using sharp if available, otherwise set defaults
  let width = 1024
  let height = 768
  try {
    const sharp = await import('sharp').then(m => m.default)
    const metadata = await sharp(imagePath).metadata()
    width = metadata.width || 1024
    height = metadata.height || 768
  } catch {
    // sharp not installed -- use defaults
  }

  // Update map record
  db.update(maps).set({
    imagePath: `/api/campaigns/${campaignId}/maps/${slug}/image`,
    width,
    height,
    isTiled: needsTiling(width, height),
    updatedAt: new Date(),
  }).where(eq(maps.id, map.id)).run()

  return { imagePath, width, height, needsTiling: needsTiling(width, height) }
})
