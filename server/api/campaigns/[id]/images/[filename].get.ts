import { readFile } from 'fs/promises'
import { join, extname } from 'path'

const EXT_TO_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

export default defineEventHandler(async (event) => {
  // Auth is enforced by the campaign middleware (visitor+ required)
  const campaign = event.context.campaign
  const filename = getRouterParam(event, 'filename')!

  // Prevent path traversal
  if (filename.includes('/') || filename.includes('..') || filename.includes('\0')) {
    throw createError({ statusCode: 400, message: 'Invalid filename' })
  }

  const filePath = join(process.cwd(), campaign.contentDir, 'images', filename)

  let data: Buffer
  try {
    data = await readFile(filePath)
  } catch {
    throw createError({ statusCode: 404, message: 'Image not found' })
  }

  const ext = extname(filename).toLowerCase()
  const contentType = EXT_TO_MIME[ext] ?? 'application/octet-stream'

  setHeader(event, 'Content-Type', contentType)
  setHeader(event, 'Cache-Control', 'public, max-age=31536000')
  return data
})
