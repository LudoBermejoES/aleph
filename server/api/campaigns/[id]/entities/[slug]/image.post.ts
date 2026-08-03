import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { entities } from '../../../../../db/schema/entities'
import { hasMinRole } from '../../../../../utils/permissions'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { ImageUploadError, validateImageUpload } from '../../../../../utils/image-upload'
import { addImage, updateImage } from '../../../../../services/entity-images'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can upload entity images' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const userId = event.context.user?.id || ''
  const db = useDb()
  const campaign = event.context.campaign

  const entity = db
    .select()
    .from(entities)
    .where(and(eq(entities.campaignId, campaignId), eq(entities.slug, slug)))
    .get()
  if (!entity) throw createError({ statusCode: 404, message: 'Entity not found' })

  const formData = await readMultipartFormData(event)
  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, message: 'No file uploaded' })
  }

  let validated
  try {
    validated = validateImageUpload(formData.find((f) => f.name === 'image'))
  } catch (err) {
    if (err instanceof ImageUploadError) {
      throw createError({ statusCode: 400, message: err.message })
    }
    throw err
  }

  // Locations own a gallery, and `entities.imageUrl` is its derived mirror. Writing the column
  // here would make this route a second writer and let the two disagree, so delegate instead: the
  // upload becomes a gallery image and is promoted to primary. Every other entity type keeps the
  // single-file behaviour below, byte for byte.
  if (entity.type === 'location') {
    const image = await addImage(db, {
      campaignId,
      entityId: entity.id,
      slug,
      contentDir: campaign.contentDir,
      data: validated.data,
      ext: validated.ext,
      caption: null,
      userId,
    })
    if (!image.isPrimary) {
      updateImage(db, entity.id, image.id, { isPrimary: true })
    }
    return { imageUrl: image.url }
  }

  const imageDir = join(process.cwd(), campaign.contentDir, 'entities', slug)
  await mkdir(imageDir, { recursive: true })
  await writeFile(join(imageDir, `image${validated.ext}`), validated.data)

  const imageUrl = `/api/campaigns/${campaignId}/entities/${slug}/image`

  db.update(entities).set({ imageUrl }).where(eq(entities.id, entity.id)).run()

  return { imageUrl }
})
