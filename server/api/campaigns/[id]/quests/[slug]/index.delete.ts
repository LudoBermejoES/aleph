import { eq, and } from 'drizzle-orm'
import { useDb, useSqlite } from '../../../../../utils/db'
import { quests } from '../../../../../db/schema/sessions'
import { entities } from '../../../../../db/schema/entities'
import { hasMinRole } from '../../../../../utils/permissions'
import { removeEntityFromIndex } from '../../../../../services/search'
import { removeEntityEmbedding } from '../../../../../services/embeddings'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'co_dm')) {
    throw createError({ statusCode: 403, message: 'Co-DM or above can delete quests' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const db = useDb()

  const quest = db
    .select()
    .from(quests)
    .where(and(eq(quests.campaignId, campaignId), eq(quests.slug, slug)))
    .get()
  if (!quest) throw createError({ statusCode: 404, message: 'Quest not found' })

  // Unlink child quests before deleting
  db.update(quests).set({ parentQuestId: null }).where(eq(quests.parentQuestId, quest.id)).run()

  db.delete(quests).where(eq(quests.id, quest.id)).run()

  // quests.id === entities.id (the mirror row backing relation-graph lookups); deleting it
  // cascades entity_relations pointing at this quest via the FK's onDelete: 'cascade'.
  db.delete(entities).where(eq(entities.id, quest.id)).run()

  const sqlite = useSqlite()
  removeEntityFromIndex(sqlite, quest.id)
  removeEntityEmbedding(sqlite, quest.id)

  return { success: true }
})
