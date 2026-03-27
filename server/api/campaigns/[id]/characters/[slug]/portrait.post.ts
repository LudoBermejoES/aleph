import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { entities } from '../../../../../db/schema/entities'
import { characters } from '../../../../../db/schema/characters'
import { hasMinRole } from '../../../../../utils/permissions'
import { writeFile, mkdir } from 'fs/promises'
import { join, extname } from 'path'
import type { CampaignRole } from '../../../../../utils/permissions'

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can upload portraits' })
  }

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
  if (!character) throw createError({ statusCode: 404, message: 'Character data not found' })

  const formData = await readMultipartFormData(event)
  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, message: 'No file uploaded' })
  }

  const file = formData.find(f => f.name === 'portrait')
  if (!file || !file.data) {
    throw createError({ statusCode: 400, message: 'Image file is required (field name: "portrait")' })
  }

  const mime = file.type || 'application/octet-stream'
  if (!ALLOWED_MIME_TYPES.includes(mime)) {
    throw createError({ statusCode: 400, message: `Invalid file type "${mime}". Allowed: png, jpeg, webp` })
  }

  if (file.data.length > MAX_SIZE_BYTES) {
    throw createError({ statusCode: 400, message: 'File exceeds the 10 MB size limit' })
  }

  const mimeToExt: Record<string, string> = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
  }
  const ext = mimeToExt[mime] ?? (extname(file.filename || '.png') || '.png')

  const portraitDir = join(process.cwd(), campaign.contentDir, 'characters', slug)
  await mkdir(portraitDir, { recursive: true })
  await writeFile(join(portraitDir, `portrait${ext}`), file.data)

  const portraitUrl = `/api/campaigns/${campaignId}/characters/${slug}/portrait`

  db.update(characters)
    .set({ portraitUrl })
    .where(eq(characters.id, character.id))
    .run()

  return { portraitUrl }
})
