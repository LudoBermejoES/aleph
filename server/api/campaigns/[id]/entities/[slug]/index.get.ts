import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { entities } from '../../../../../db/schema/entities'
import { readEntityFile, stripSecretBlocks } from '../../../../../services/content'
import { autoLinkContent } from '../../../../../services/autolink-render'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()
  const role = (event.context.campaignRole || 'visitor') as CampaignRole

  const entity = db.select().from(entities)
    .where(and(eq(entities.campaignId, campaignId), eq(entities.slug, slug)))
    .get()

  if (!entity) {
    throw createError({ statusCode: 404, message: 'Entity not found' })
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
    frontmatter: file.frontmatter,
    content: autoLinkContent(stripSecretBlocks(file.content, role), campaignId, entity.id, db),
    fields: file.frontmatter.fields || {},
  }
})
