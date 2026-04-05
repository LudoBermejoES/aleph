import { eq, and, inArray } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { entities } from '../../../../db/schema/entities'
import { stripSecretBlocks } from '../../../../services/content'
import { safeReadEntityFile } from '../../../../utils/content-helpers'
import {
  canUserAccessEntity,
  getCachedPermission,
  setCachedPermission,
} from '../../../../utils/permissions'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const role = (event.context.campaignRole || 'visitor') as CampaignRole
  const userId = event.context.user?.id || ''
  const db = useDb()

  const entity = db
    .select()
    .from(entities)
    .where(
      and(
        eq(entities.campaignId, campaignId),
        eq(entities.slug, slug),
        eq(entities.type, 'location'),
      ),
    )
    .get()
  if (!entity) throw createError({ statusCode: 404, message: 'Location not found' })

  // Visibility enforcement
  const cached = getCachedPermission(userId, entity.id, 'view')
  const canAccess =
    cached !== null
      ? cached
      : await canUserAccessEntity(
          db,
          userId,
          'user',
          role,
          entity.id,
          entity.visibility,
          entity.createdBy,
          'view',
        )
  if (cached === null) setCachedPermission(userId, entity.id, 'view', canAccess)
  if (!canAccess) throw createError({ statusCode: 404, message: 'Location not found' })

  // Build ancestors breadcrumb
  const ancestors: { name: string; slug: string }[] = []
  let currentParentId = entity.parentId
  while (currentParentId) {
    const parent = db
      .select({
        id: entities.id,
        name: entities.name,
        slug: entities.slug,
        parentId: entities.parentId,
      })
      .from(entities)
      .where(eq(entities.id, currentParentId))
      .get()
    if (!parent) break
    ancestors.unshift({ name: parent.name, slug: parent.slug })
    currentParentId = parent.parentId
  }

  const file = (await safeReadEntityFile(entity.filePath)) ?? {
    frontmatter: { fields: { subtype: 'other' } },
    content: '',
    contentHash: '',
  }

  const subtype = (file.frontmatter?.fields?.subtype as string) ?? 'other'

  return {
    ...entity,
    subtype,
    ancestors,
    frontmatter: file.frontmatter,
    content: stripSecretBlocks(file.content, role),
  }
})
