import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { maps } from '../../../../../db/schema/maps'
import { hasMinRole } from '../../../../../utils/permissions'
import { validateMapImage } from '../../../../../services/maps'
import { logger } from '../../../../../utils/logger'
import { writeFile, mkdir } from 'fs/promises'
import { join, extname } from 'path'
import { detectMimeFromBytes } from '../../../../../utils/sanitize'
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

  const map = db
    .select()
    .from(maps)
    .where(and(eq(maps.campaignId, campaignId), eq(maps.slug, slug)))
    .get()
  if (!map) throw createError({ statusCode: 404, message: 'Map not found' })

  // Read multipart form data
  const formData = await readMultipartFormData(event)
  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, message: 'No file uploaded' })
  }

  const file = formData.find((f) => f.name === 'image')
  if (!file || !file.data) {
    throw createError({ statusCode: 400, message: 'Image file is required (field name: "image")' })
  }

  // Validate declared MIME + size
  const fileMime = file.type || 'application/octet-stream'
  const validation = validateMapImage({ mimetype: fileMime, size: file.data.length })
  if (!validation.valid) {
    throw createError({ statusCode: 400, message: validation.error })
  }

  // Validate actual content via magic bytes
  const detectedMime = detectMimeFromBytes(file.data)
  if (!detectedMime || detectedMime !== fileMime) {
    throw createError({
      statusCode: 400,
      message: 'File content does not match declared MIME type',
    })
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
    const sharp = await import('sharp').then((m) => m.default)
    const metadata = await sharp(imagePath).metadata()
    width = metadata.width || 1024
    height = metadata.height || 768
  } catch {
    // sharp not installed -- use defaults
  }

  // Update map record
  db.update(maps)
    .set({
      imagePath: `/api/campaigns/${campaignId}/maps/${slug}/image`,
      width,
      height,
      isTiled: false,
      updatedAt: new Date(),
    })
    .where(eq(maps.id, map.id))
    .run()

  // Always kick off background tiling
  const tilesDir = join(contentDir, 'tiles')
  runTask('maps:tile', { payload: { mapId: map.id, imagePath, outputDir: tilesDir } }).catch(
    (err: unknown) => logger.error('Tiling task failed', { error: err }),
  )

  return { imagePath, width, height }
})
