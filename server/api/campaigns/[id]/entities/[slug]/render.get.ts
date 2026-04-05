import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { entities } from '../../../../../db/schema/entities'
import { secretReveals } from '../../../../../db/schema/secrets'
import { readEntityFile, stripSecretBlocks } from '../../../../../services/content'
import { autoLinkContent } from '../../../../../services/autolink-render'
import { hasMinRole } from '../../../../../utils/permissions'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()
  const actualRole = (event.context.campaignRole || 'visitor') as CampaignRole

  const entity = db.select().from(entities)
    .where(and(eq(entities.campaignId, campaignId), eq(entities.slug, slug)))
    .get()
  if (!entity) throw createError({ statusCode: 404, message: 'Entity not found' })

  // Support preview_as for DM/Co-DM only
  const previewAs = getQuery(event).preview_as as string | undefined
  let effectiveRole = actualRole
  let previewMode = false
  if (previewAs && hasMinRole(actualRole, 'co_dm')) {
    const validRoles: CampaignRole[] = ['dm', 'co_dm', 'editor', 'player', 'visitor']
    if (validRoles.includes(previewAs as CampaignRole)) {
      effectiveRole = previewAs as CampaignRole
      previewMode = true
    }
  }

  // Load revealed block IDs for this entity
  const revealsRows = db.select({ secretBlockId: secretReveals.secretBlockId })
    .from(secretReveals)
    .where(eq(secretReveals.entityId, entity.id))
    .all()
  const revealedBlockIds = new Set(revealsRows.map(r => r.secretBlockId))

  let file
  try {
    file = await readEntityFile(entity.filePath)
  } catch {
    file = { frontmatter: {}, content: '', contentHash: '' }
  }

  const strippedContent = stripSecretBlocks(file.content, effectiveRole, revealedBlockIds)
  const renderedContent = autoLinkContent(strippedContent, campaignId, entity.id, db)

  return {
    entityId: entity.id,
    slug: entity.slug,
    content: renderedContent,
    previewMode,
    effectiveRole,
  }
})
