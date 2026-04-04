import { eq, and } from 'drizzle-orm'
import { useDb } from '../../../../../utils/db'
import { quests } from '../../../../../db/schema/sessions'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()

  const quest = db.select().from(quests)
    .where(and(eq(quests.campaignId, campaignId), eq(quests.slug, slug)))
    .get()

  if (!quest) throw createError({ statusCode: 404, message: 'Quest not found' })

  return quest
})
