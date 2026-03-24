import { eq } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { arcs, chapters } from '../../../../db/schema/sessions'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const db = useDb()

  const arcList = db.select().from(arcs)
    .where(eq(arcs.campaignId, campaignId))
    .orderBy(arcs.sortOrder)
    .all()

  return arcList.map(arc => {
    const chapterList = db.select().from(chapters)
      .where(eq(chapters.arcId, arc.id))
      .orderBy(chapters.sortOrder)
      .all()
    return { ...arc, chapters: chapterList }
  })
})
