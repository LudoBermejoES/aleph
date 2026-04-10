import { eq } from 'drizzle-orm'
import { useDb } from '../../../../utils/db'
import { arcs, chapters } from '../../../../db/schema/sessions'
import { stripSecretBlocks } from '../../../../services/content'
import { hasMinRole } from '../../../../utils/permissions'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const db = useDb()
  const actualRole = (event.context.campaignRole || 'visitor') as CampaignRole

  const previewAs = getQuery(event).preview_as as string | undefined
  let role = actualRole
  if (previewAs && hasMinRole(actualRole, 'co_dm')) {
    const validRoles: CampaignRole[] = ['dm', 'co_dm', 'editor', 'player', 'visitor']
    if (validRoles.includes(previewAs as CampaignRole)) {
      role = previewAs as CampaignRole
    }
  }

  const arcList = db
    .select()
    .from(arcs)
    .where(eq(arcs.campaignId, campaignId))
    .orderBy(arcs.sortOrder)
    .all()

  return arcList.map((arc) => {
    const chapterList = db
      .select()
      .from(chapters)
      .where(eq(chapters.arcId, arc.id))
      .orderBy(chapters.sortOrder)
      .all()
    return {
      ...arc,
      description: arc.description ? stripSecretBlocks(arc.description, role) : arc.description,
      chapters: chapterList.map((ch) => ({
        ...ch,
        description: ch.description ? stripSecretBlocks(ch.description, role) : ch.description,
      })),
    }
  })
})
