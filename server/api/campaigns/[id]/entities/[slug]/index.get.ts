import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { entities } from '../../../../../db/schema/entities'
import { characters } from '../../../../../db/schema/characters'
import { readEntityFile, stripSecretBlocks } from '../../../../../services/content'
import { autoLinkContent } from '../../../../../services/autolink-render'
import type { CampaignRole } from '../../../../../utils/permissions'
import { canUserAccessEntity, getCachedPermission, setCachedPermission } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()
  const role = (event.context.campaignRole || 'visitor') as CampaignRole
  const userId = event.context.user?.id || ''

  const entity = db.select().from(entities)
    .where(and(eq(entities.campaignId, campaignId), eq(entities.slug, slug)))
    .get()

  if (!entity) {
    throw createError({ statusCode: 404, message: 'Entity not found' })
  }

  // Visibility enforcement
  const cached = getCachedPermission(userId, entity.id, 'view')
  const canAccess = cached !== null
    ? cached
    : await canUserAccessEntity(db, userId, 'user', role, entity.id, entity.visibility, entity.createdBy, 'view')
  if (cached === null) setCachedPermission(userId, entity.id, 'view', canAccess)
  if (!canAccess) throw createError({ statusCode: 404, message: 'Entity not found' })

  // For character entities, fall back to portraitUrl if no entity image is set
  let imageUrl = entity.imageUrl ?? null
  if (!imageUrl && entity.type === 'character') {
    const character = db.select({ portraitUrl: characters.portraitUrl })
      .from(characters)
      .where(eq(characters.entityId, entity.id))
      .get()
    if (character?.portraitUrl) {
      imageUrl = character.portraitUrl
    }
  }

  // Read markdown file
  let file
  try {
    file = await readEntityFile(entity.filePath)
  } catch {
    file = { frontmatter: {}, content: '', contentHash: '' }
  }

  return {
    ...entity,
    imageUrl,
    frontmatter: file.frontmatter,
    content: autoLinkContent(stripSecretBlocks(file.content, role), campaignId, entity.id, db),
    fields: file.frontmatter.fields || {},
  }
})
