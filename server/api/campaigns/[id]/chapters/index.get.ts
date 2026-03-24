import { eq } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { chapters } from '../../../../db/schema/sessions'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const arcId = query.arc_id as string
  const db = useDb()

  if (!arcId) throw createError({ statusCode: 400, message: 'arc_id query param required' })

  return db.select().from(chapters)
    .where(eq(chapters.arcId, arcId))
    .orderBy(chapters.sortOrder)
    .all()
})
