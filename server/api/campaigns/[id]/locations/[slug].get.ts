
import { eq, and, inArray } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { entities } from '../../../../db/schema/entities'
import { stripSecretBlocks } from '../../../../services/content'
import { safeReadEntityFile } from '../../../../utils/content-helpers'
import { hasMinRole, ROLE_LEVEL, VISIBILITY_MIN_ROLE } from '../../../../utils/permissions'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const role = (event.context.campaignRole || 'visitor') as CampaignRole
  const userId = event.context.user?.id || ''
  const db = useDb()

  const entity = db.select().from(entities)
    .where(and(eq(entities.campaignId, campaignId), eq(entities.slug, slug), eq(entities.type, 'location')))
    .get()
  if (!entity) throw createError({ statusCode: 404, message: 'Location not found' })

  // Visibility check
  if (!hasMinRole(role, 'co_dm')) {
    const userLevel = ROLE_LEVEL[role] ?? 0
    const minLevel = VISIBILITY_MIN_ROLE[entity.visibility] ?? 99
    const isOwner = entity.createdBy === userId
    if (userLevel < minLevel && !isOwner) {
      throw createError({ statusCode: 403, message: 'Access denied' })
    }
  }

  // Build ancestors breadcrumb
  const ancestors: { name: string; slug: string }[] = []
  let currentParentId = entity.parentId
  while (currentParentId) {
    const parent = db.select({ id: entities.id, name: entities.name, slug: entities.slug, parentId: entities.parentId })
      .from(entities)
      .where(eq(entities.id, currentParentId))
      .get()
    if (!parent) break
    ancestors.unshift({ name: parent.name, slug: parent.slug })
    currentParentId = parent.parentId
  }

  const file = await safeReadEntityFile(entity.filePath)
    ?? { frontmatter: { fields: { subtype: 'other' } }, content: '', contentHash: '' }

  const subtype = file.frontmatter?.fields?.subtype as string ?? 'other'

  return {
    ...entity,
    subtype,
    ancestors,
    frontmatter: file.frontmatter,
    content: stripSecretBlocks(file.content, role),
  }
})
