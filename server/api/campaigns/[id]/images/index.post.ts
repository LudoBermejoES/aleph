import { hasMinRole } from '../../../../utils/permissions'
import { writeFile, mkdir } from 'fs/promises'
import { join, extname } from 'path'
import { randomUUID } from 'crypto'
import type { CampaignRole } from '../../../../utils/permissions'

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can upload images' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const campaign = event.context.campaign

  const formData = await readMultipartFormData(event)
  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, message: 'No file uploaded' })
  }

  const file = formData.find(f => f.name === 'file')
  if (!file || !file.data) {
    throw createError({ statusCode: 400, message: 'Image file is required (field name: "file")' })
  }

  const mime = file.type || 'application/octet-stream'
  if (!ALLOWED_MIME_TYPES.includes(mime)) {
    throw createError({ statusCode: 400, message: `Invalid file type "${mime}". Allowed: png, jpeg, webp, gif` })
  }

  if (file.data.length > MAX_SIZE_BYTES) {
    throw createError({ statusCode: 400, message: 'File exceeds the 10 MB size limit' })
  }

  const mimeToExt: Record<string, string> = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
    'image/gif': '.gif',
  }
  const ext = mimeToExt[mime] ?? (extname(file.filename || '.png') || '.png')
  const filename = `${randomUUID()}${ext}`

  const imagesDir = join(process.cwd(), campaign.contentDir, 'images')
  await mkdir(imagesDir, { recursive: true })
  await writeFile(join(imagesDir, filename), file.data)

  return {
    url: `/api/campaigns/${campaignId}/images/${filename}`,
    filename,
  }
})
