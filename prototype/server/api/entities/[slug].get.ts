import { db } from '../../db'
import { entities } from '../../db/schema'
import { eq } from 'drizzle-orm'
import { readEntityFile } from '../../utils/markdown'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!

  const entity = db.select().from(entities).where(eq(entities.slug, slug)).get()

  if (!entity) {
    throw createError({ statusCode: 404, message: 'Entity not found' })
  }

  // Read the markdown file from disk
  const file = await readEntityFile(entity.filePath)

  return {
    ...entity,
    frontmatter: file.frontmatter,
    content: file.content,
  }
})
