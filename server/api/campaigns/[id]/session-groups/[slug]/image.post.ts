import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { sessionGroups } from '../../../../../db/schema/sessions'
import { hasMinRole } from '../../../../../utils/permissions'
import { writeFile, mkdir } from 'fs/promises'
import { join, extname } from 'path'
import { detectMimeFromBytes } from '../../../../../utils/sanitize'
import type { CampaignRole } from '../../../../../utils/permissions'

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can upload session group images' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()
  const campaign = event.context.campaign

  const group = db.select().from(sessionGroups)
    .where(and(eq(sessionGroups.campaignId, campaignId), eq(sessionGroups.slug, slug)))
    .get()
  if (!group) throw createError({ statusCode: 404, message: 'Session group not found' })

  const formData = await readMultipartFormData(event)
  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, message: 'No file uploaded' })
  }

  const file = formData.find(f => f.name === 'image')
  if (!file || !file.data) {
    throw createError({ statusCode: 400, message: 'Image file is required (field name: "image")' })
  }

  const mime = file.type || 'application/octet-stream'
  if (!ALLOWED_MIME_TYPES.includes(mime)) {
    throw createError({ statusCode: 400, message: `Invalid file type "${mime}". Allowed: png, jpeg, webp` })
  }

  if (file.data.length > MAX_SIZE_BYTES) {
    throw createError({ statusCode: 400, message: 'File exceeds the 10 MB size limit' })
  }

  const detectedMime = detectMimeFromBytes(file.data)
  if (!detectedMime || detectedMime !== mime) {
    throw createError({ statusCode: 400, message: 'File content does not match declared MIME type' })
  }

  const mimeToExt: Record<string, string> = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
  }
  const ext = mimeToExt[mime] ?? (extname(file.filename || '.png') || '.png')

  const imageDir = join(process.cwd(), campaign.contentDir, 'session-groups', slug)
  await mkdir(imageDir, { recursive: true })
  await writeFile(join(imageDir, `image${ext}`), file.data)

  const imageUrl = `/api/campaigns/${campaignId}/session-groups/${slug}/image`

  db.update(sessionGroups).set({ imageUrl, updatedAt: new Date() })
    .where(eq(sessionGroups.id, group.id))
    .run()

  return { imageUrl }
})
