import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { entities } from '../../../../db/schema/entities'
import { readEntityFile } from '../../../../services/content'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()

  const entity = db.select().from(entities)
    .where(and(eq(entities.campaignId, campaignId), eq(entities.slug, slug)))
    .get()

  if (!entity) {
    throw createError({ statusCode: 404, message: 'Entity not found' })
  }

  // TODO: check visibility permissions against user role

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
    content: file.content,
  }
})
